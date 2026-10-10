/*
 * Chime Curtain — strands of letters hanging in a doorway. They part around the
 * cursor (or finger) and ring like wind chimes as you brush through them.
 * No libraries. Usage:
 *
 *   const curtain = new ChimeCurtain(document.getElementById("scene"), { image: "images/gate-3.webp", ... })
 *   curtain.set({ soundType: "glass" })   // change settings live
 *
 * Physics: Verlet integration + "dynamic follow-the-leader" rope constraint (Müller 2012).
 * Sound: synthesised with the Web Audio API (no audio files).
 */
;(function () {
    "use strict"

    /* ------------------------------------------------------------------ */
    /* Audio — one shared engine for the whole page                         */
    /* ------------------------------------------------------------------ */

    var engine = null
    var MAX_OSC = 96

    function makeImpulse(ctx, seconds) {
        var len = Math.floor(ctx.sampleRate * seconds)
        var buf = ctx.createBuffer(2, len, ctx.sampleRate)
        for (var ch = 0; ch < 2; ch++) {
            var d = buf.getChannelData(ch)
            for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
        }
        return buf
    }

    function getEngine() {
        if (engine) return engine
        var AC = window.AudioContext || window.webkitAudioContext
        if (!AC) return null
        var ctx = new AC()
        var master = ctx.createGain()
        master.gain.value = 0.5
        var comp = ctx.createDynamicsCompressor()
        var verb = ctx.createConvolver()
        verb.buffer = makeImpulse(ctx, 2.4)
        var wet = ctx.createGain()
        wet.gain.value = 0.28
        master.connect(comp)
        master.connect(verb)
        verb.connect(wet)
        wet.connect(comp)
        comp.connect(ctx.destination)
        var noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.2), ctx.sampleRate)
        var nd = noise.getChannelData(0)
        for (var j = 0; j < nd.length; j++) nd[j] = Math.random() * 2 - 1
        engine = { ctx: ctx, master: master, noise: noise, active: 0 }
        return engine
    }

    // Browsers only allow sound after a real click / tap / key press.
    function unlockAudio() {
        var e = getEngine()
        if (e && e.ctx.state !== "running") return e.ctx.resume()
        return Promise.resolve()
    }
    var unlockBound = false
    function bindUnlock() {
        if (unlockBound) return
        unlockBound = true
        window.addEventListener("pointerdown", unlockAudio, { passive: true })
        window.addEventListener("keydown", unlockAudio)
        window.addEventListener("touchend", unlockAudio, { passive: true })
    }

    function tone(e, f, amp, t, attack, decay) {
        if (f >= e.ctx.sampleRate / 2 || amp <= 0 || e.active >= MAX_OSC) return
        var o = e.ctx.createOscillator()
        o.type = "sine"
        o.frequency.value = f
        var g = e.ctx.createGain()
        g.gain.setValueAtTime(0.0001, t)
        g.gain.exponentialRampToValueAtTime(Math.max(amp, 0.0002), t + attack)
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
        o.connect(g)
        g.connect(e.master)
        o.start(t)
        o.stop(t + decay + 0.05)
        e.active++
        o.onended = function () {
            e.active--
            g.disconnect()
        }
    }

    var PENTA = [0, 2, 4, 7, 9]
    function pentatonic(base, step) {
        var oct = Math.floor(step / PENTA.length)
        return base * Math.pow(2, oct + PENTA[step % PENTA.length] / 12)
    }

    function playNote(type, step, amp) {
        var e = engine
        if (!e || e.ctx.state !== "running") return
        var t = e.ctx.currentTime + 0.005
        var i, p
        if (type === "chime") {
            // tubular-bell partials (inharmonic), long ring
            var f = pentatonic(440, step) * (1 + (Math.random() - 0.5) * 0.004)
            var chime = [[1, 1, 2.6], [2.76, 0.5, 1.6], [5.4, 0.25, 0.9], [8.93, 0.12, 0.5]]
            for (i = 0; i < chime.length; i++) {
                p = chime[i]
                tone(e, f * p[0], amp * p[1] * 0.5, t, 0.003, p[2])
            }
        } else if (type === "glass") {
            // bright, short, slightly detuned pair for shimmer
            var fg = pentatonic(880, step)
            var glass = [[1, 1, 1.3], [2.32, 0.45, 0.75], [4.25, 0.2, 0.4], [6.63, 0.08, 0.25]]
            for (i = 0; i < glass.length; i++) {
                p = glass[i]
                tone(e, fg * p[0], amp * p[1] * 0.35, t, 0.002, p[2])
                tone(e, fg * p[0] * 1.003, amp * p[1] * 0.2, t, 0.002, p[2] * 0.8)
            }
        } else {
            // beads: a few band-passed noise clicks
            var n = 2 + Math.floor(Math.random() * 3)
            for (var k = 0; k < n; k++) {
                if (e.active >= MAX_OSC) break
                var tk = t + k * (0.012 + Math.random() * 0.03)
                var src = e.ctx.createBufferSource()
                src.buffer = e.noise
                var bp = e.ctx.createBiquadFilter()
                bp.type = "bandpass"
                bp.frequency.value = 1400 + step * 180 + Math.random() * 1600
                bp.Q.value = 7
                var g = e.ctx.createGain()
                g.gain.setValueAtTime(0.0001, tk)
                g.gain.exponentialRampToValueAtTime(Math.max(amp * 1.4, 0.0002), tk + 0.001)
                g.gain.exponentialRampToValueAtTime(0.0001, tk + 0.07)
                src.connect(bp)
                bp.connect(g)
                g.connect(e.master)
                src.start(tk, Math.random() * 0.1, 0.09)
                e.active++
                src.onended = (function (gain) {
                    return function () {
                        e.active--
                        gain.disconnect()
                    }
                })(g)
            }
        }
    }

    /* ------------------------------------------------------------------ */
    /* Physics                                                              */
    /* ------------------------------------------------------------------ */

    var FTL_DAMP = 0.9

    // One bead per visible letter. Scripts like Bangla and Hindi attach vowel signs to the
    // letter before them, so split into grapheme clusters instead of single code points.
    var segmenter = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null
    function splitGlyphs(text) {
        text = (text || "·").replace(/\s+/g, " ")
        if (segmenter) return Array.from(segmenter.segment(text), function (s) { return s.segment })
        return Array.from(text)
    }

    function buildSim(w, h, o) {
        var gap = Math.max(3, (o.fontSize * o.letterSpacing) / Math.max(0.2, o.density))
        var seg = Math.max(3, o.fontSize * o.lineHeight)
        var C = Math.max(1, Math.floor(w / gap))
        var x0 = (w - (C - 1) * gap) / 2
        var y0 = seg * 0.6
        var N = Math.max(2, Math.floor((h - y0) / seg) + 1)
        var total = C * N
        var px = new Float32Array(total)
        var py = new Float32Array(total)
        var rnd = new Float32Array(total)
        var text = splitGlyphs(o.text)
        var L = text.length || 1
        var glyph = new Array(total)
        for (var c = 0; c < C; c++) {
            for (var i = 0; i < N; i++) {
                var k = c * N + i
                px[k] = x0 + c * gap
                py[k] = y0 + i * seg
                rnd[k] = Math.random()
                glyph[k] = text[k % L]
            }
        }
        return { w: w, h: h, C: C, N: N, seg: seg, gap: gap, x0: x0, y0: y0, px: px, py: py, ox: px.slice(), oy: py.slice(), rnd: rnd, glyph: glyph }
    }

    function step(s, o, ptr, t, sway) {
        var C = s.C, N = s.N, seg = s.seg, px = s.px, py = s.py, ox = s.ox, oy = s.oy
        var g = o.gravity * 0.22
        var damp = 0.96
        var R = Math.max(1, o.radius)
        var R2 = R * R
        var push = Math.min(0.9, 0.12 * o.interact) // how hard the brush parts the strands
        var pushMax = 0.8 + 0.45 * o.interact // px/frame: a faster cursor passes through the strands
        var drag = 0.02 * o.interact // how much strands swing along with the cursor
        var MAXV = 7 // px/frame cap so fast swipes don't whip strands over

        for (var c = 0; c < C; c++) {
            var wind = sway * 0.006 * Math.sin(t * 0.55 + c * 0.22) + sway * 0.003 * Math.sin(t * 1.6 + c * 0.8)
            var base = c * N
            var restX = s.x0 + c * s.gap
            var i, k
            for (i = 1; i < N; i++) {
                k = base + i
                var vx = (px[k] - ox[k]) * damp
                var vy = (py[k] - oy[k]) * damp
                var v2 = vx * vx + vy * vy
                if (v2 > MAXV * MAXV) {
                    var sc = MAXV / Math.sqrt(v2)
                    vx *= sc
                    vy *= sc
                }
                ox[k] = px[k]
                oy[k] = py[k]
                px[k] += vx + wind + (restX - px[k]) * 0.0015 // weak pull back under the pin
                py[k] += vy + g
                if (ptr.active) {
                    var dx = px[k] - ptr.x
                    var dy = py[k] - ptr.y
                    var d2 = dx * dx + dy * dy
                    if (d2 < R2) {
                        // permeable brush: ease points toward the brush edge at a capped speed,
                        // mostly without momentum, plus a swing from the cursor's motion
                        var d = Math.sqrt(d2) || 0.001
                        var f = 1 - d / R
                        var out = Math.min((R - d) * push, pushMax)
                        var mx = (dx / d) * out
                        var my = (dy / d) * out * 0.3
                        px[k] += mx + ptr.vx * f * drag
                        py[k] += my + ptr.vy * f * drag * 0.4
                        ox[k] += mx * 0.75
                        oy[k] += my * 0.75
                    }
                }
            }
            // pin the top, then keep every segment exactly `seg` long (dynamic follow-the-leader)
            px[base] = restX
            py[base] = s.y0
            for (i = 1; i < N; i++) {
                var a = base + i - 1
                var b = base + i
                var ddx = px[b] - px[a]
                var ddy = py[b] - py[a]
                var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 0.0001
                var r = seg / dd
                var nx = px[a] + ddx * r
                var ny = py[a] + ddy * r
                if (i > 1) {
                    ox[a] += (nx - px[b]) * FTL_DAMP
                    oy[a] += (ny - py[b]) * FTL_DAMP
                }
                px[b] = nx
                py[b] = ny
            }
        }
    }

    // Doorway outline: straight sides with a half-ellipse on top ("rise" px tall).
    function archPath(ctx, w, h, rise) {
        ctx.beginPath()
        if (rise < 1) {
            ctx.rect(0, 0, w, h)
            return
        }
        var r = Math.min(rise, h)
        ctx.moveTo(0, h)
        ctx.lineTo(0, r)
        ctx.ellipse(w / 2, r, w / 2, r, 0, Math.PI, Math.PI * 2)
        ctx.lineTo(w, h)
        ctx.closePath()
    }

    // Cover-fit the picture into the box (plus zoom), keep the doorway centred horizontally,
    // and return where the picture and the doorway land, in pixels.
    function sceneLayout(W, H, iw, ih, o) {
        var sc = Math.max(W / iw, H / ih) * Math.max(1, o.zoom || 1)
        var dw = iw * sc
        var dh = ih * sc
        var cx = ((o.door.x + o.door.w / 2) / 100) * dw
        var ox = Math.min(0, Math.max(W - dw, W / 2 - cx))
        var oy = Math.min(0, Math.max(H - dh, H / 2 - dh / 2))
        return {
            img: { x: ox, y: oy, w: dw, h: dh },
            door: { x: ox + (o.door.x / 100) * dw, y: oy + (o.door.y / 100) * dh, w: (o.door.w / 100) * dw, h: (o.door.h / 100) * dh },
        }
    }

    function draw(ctx, s, o, dpr) {
        var C = s.C, N = s.N, px = s.px, py = s.py, rnd = s.rnd, glyph = s.glyph
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
        ctx.clearRect(0, 0, s.w, s.h)
        ctx.save()
        archPath(ctx, s.w, s.h, ((o.archHeight || 0) / 100) * s.h)
        ctx.clip()
        if (o.doorShade && o.doorShade !== "transparent") {
            ctx.fillStyle = o.doorShade
            ctx.fillRect(0, 0, s.w, s.h)
        }
        ctx.font = o.fontSize + "px " + o.fontFamily
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        for (var pass = 0; pass < 2; pass++) {
            ctx.fillStyle = pass === 0 ? o.color : o.accentColor
            for (var c = 0; c < C; c++) {
                var base = c * N
                for (var i = 0; i < N; i++) {
                    var k = base + i
                    if ((rnd[k] < o.accentAmount) !== (pass === 1)) continue
                    var ch = glyph[k]
                    if (ch === " ") continue
                    var a = i > 0 ? k - 1 : k
                    var b = i > 0 ? k : k + 1
                    var dx = px[b] - px[a]
                    var dy = py[b] - py[a]
                    var len = Math.sqrt(dx * dx + dy * dy) || 1
                    var cos = dy / len
                    var sin = -dx / len
                    ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * px[k], dpr * py[k])
                    ctx.fillText(ch, 0, 0)
                }
            }
        }
        ctx.restore()
    }

    /* ------------------------------------------------------------------ */
    /* The component                                                        */
    /* ------------------------------------------------------------------ */

    var DEFAULTS = {
        image: "", // picture to fill the box with; empty = curtain fills the whole box
        imageAlt: "",
        door: { x: 0, y: 0, w: 100, h: 100 }, // doorway, in % of the picture
        archHeight: 37, // curved top, in % of the doorway height (0 = rectangle)
        zoom: 1,
        text: "上善若水 水善利萬物而不爭",
        fontFamily: '"Noto Serif SC", "Songti SC", "SimSun", "Microsoft YaHei", serif',
        color: "#F3D9A4",
        accentColor: "#FF3B2F",
        accentAmount: 0.3,
        doorShade: "rgba(4,14,14,0.45)",
        fontSize: 11,
        letterSpacing: 1.25,
        lineHeight: 0.95,
        density: 1.1,
        gravity: 0.7,
        interact: 2.7,
        radius: 40,
        sway: 0.4,
        sound: true,
        soundType: "chime", // "chime" | "beads" | "glass"
        volume: 0.8,
    }
    // changing any of these rebuilds the strands
    var REBUILD = ["text", "fontSize", "letterSpacing", "lineHeight", "density", "door", "zoom", "image"]

    function ChimeCurtain(el, options) {
        this.el = el
        this.o = Object.assign({}, DEFAULTS, options || {})
        this.sim = null
        this.simKey = ""
        this.natural = null
        this.dpr = 1
        this.visible = true
        this.ptr = { x: -9999, y: -9999, vx: 0, vy: 0, lastX: 0, lastY: 0, active: false }
        this.lastCol = null
        this.lastNote = 0
        this.cooldown = {}
        this.time = 0
        this.acc = 0
        this.last = performance.now()
        this.touched = false
        this.reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches

        if (getComputedStyle(el).position === "static") el.style.position = "relative"
        el.style.overflow = "hidden"

        this.img = document.createElement("img")
        this.img.decoding = "async"
        this.img.draggable = false
        Object.assign(this.img.style, { position: "absolute", left: "0", top: "0", maxWidth: "none", visibility: "hidden", userSelect: "none", pointerEvents: "none" })
        el.appendChild(this.img)

        this.canvas = document.createElement("canvas")
        Object.assign(this.canvas.style, { position: "absolute", left: "0", top: "0", display: "block", touchAction: "none" })
        el.appendChild(this.canvas)
        this.ctx = this.canvas.getContext("2d")

        var self = this
        this._onLoad = function () {
            if (!self.img.naturalWidth) return
            self.natural = { w: self.img.naturalWidth, h: self.img.naturalHeight }
            self.sim = null
            self._layout()
        }
        this.img.addEventListener("load", this._onLoad)
        this._setImage()

        this._ro = new ResizeObserver(function () {
            self._layout()
        })
        this._ro.observe(el)
        this._io = new IntersectionObserver(function (entries) {
            self.visible = entries[0] ? entries[0].isIntersecting : true
        })
        this._io.observe(el)

        this._onMove = function (e) {
            if (!self.sim) return
            var r = self.canvas.getBoundingClientRect()
            var x = (e.clientX - r.left) * (self.sim.w / (r.width || 1))
            var y = (e.clientY - r.top) * (self.sim.h / (r.height || 1))
            if (!self.ptr.active) {
                self.ptr.lastX = x
                self.ptr.lastY = y
            }
            self.ptr.x = x
            self.ptr.y = y
            self.ptr.active = true
        }
        this._onLeave = function (e) {
            if (e && e.type === "pointerout" && e.relatedTarget) return
            self.ptr.active = false
            self.lastCol = null
        }
        this._onUp = function (e) {
            if (e.pointerType !== "mouse") self._onLeave(e)
        }
        window.addEventListener("pointermove", this._onMove, { passive: true })
        window.addEventListener("pointerdown", this._onMove, { passive: true })
        window.addEventListener("pointerup", this._onUp, { passive: true })
        window.addEventListener("pointercancel", this._onLeave, { passive: true })
        document.addEventListener("pointerout", this._onLeave, { passive: true })
        window.addEventListener("blur", this._onLeave)
        bindUnlock()

        this._frame = this._frame.bind(this)
        this._raf = requestAnimationFrame(this._frame)
        this._layout()
    }

    ChimeCurtain.prototype._setImage = function () {
        if (this.o.image) {
            this.img.style.display = ""
            this.img.alt = this.o.imageAlt || ""
            this.natural = null
            this.img.src = this.o.image
            if (this.img.complete) this._onLoad()
        } else {
            this.img.removeAttribute("src")
            this.img.style.display = "none"
            this.natural = null
        }
    }

    ChimeCurtain.prototype._layout = function () {
        var o = this.o
        var W = Math.max(1, this.el.clientWidth)
        var H = Math.max(1, this.el.clientHeight)
        var box = { x: 0, y: 0, w: W, h: H }
        if (o.image) {
            if (!this.natural) {
                this.canvas.style.display = "none" // wait for the picture
                return
            }
            var L = sceneLayout(W, H, this.natural.w, this.natural.h, o)
            var st = this.img.style
            st.left = L.img.x + "px"
            st.top = L.img.y + "px"
            st.width = L.img.w + "px"
            st.height = L.img.h + "px"
            st.visibility = "visible"
            box = L.door
        }
        var bw = Math.max(1, Math.round(box.w))
        var bh = Math.max(1, Math.round(box.h))
        var cs = this.canvas.style
        cs.display = "block"
        cs.left = Math.round(box.x) + "px"
        cs.top = Math.round(box.y) + "px"
        cs.width = bw + "px"
        cs.height = bh + "px"
        this.dpr = Math.min(2, window.devicePixelRatio || 1)
        var key = bw + "x" + bh + "@" + this.dpr
        if (!this.sim || key !== this.simKey) {
            this.simKey = key
            this.canvas.width = Math.round(bw * this.dpr)
            this.canvas.height = Math.round(bh * this.dpr)
            this.sim = buildSim(bw, bh, o)
        }
    }

    ChimeCurtain.prototype._sounds = function () {
        var s = this.sim, o = this.o, ptr = this.ptr
        if (!o.sound || !engine || !ptr.active || ptr.y < 0 || ptr.y > s.h) {
            this.lastCol = null
            return
        }
        var col = Math.round((ptr.x - s.x0) / s.gap)
        if (this.lastCol !== null && col !== this.lastCol) {
            var speed = Math.hypot(ptr.vx, ptr.vy)
            if (speed > 0.6) {
                var dir = col > this.lastCol ? 1 : -1
                var played = 0
                var now = performance.now()
                for (var c = this.lastCol + dir; c !== col + dir && played < 2; c += dir) {
                    if (c < 0 || c >= s.C) continue
                    if (now - this.lastNote < 32) break
                    if (now - (this.cooldown[c] || 0) < 140) continue
                    var stepIdx = Math.min(9, Math.floor((c / s.C) * 10))
                    var amp = Math.min(1, 0.25 + speed / 22) * o.volume
                    playNote(o.soundType, stepIdx, amp)
                    this.cooldown[c] = now
                    this.lastNote = now
                    played++
                }
            }
        }
        this.lastCol = col
    }

    ChimeCurtain.prototype._frame = function (now) {
        this._raf = requestAnimationFrame(this._frame)
        var dt = Math.min(0.1, (now - this.last) / 1000)
        this.last = now
        if (!this.visible || !this.sim) return
        var ptr = this.ptr, o = this.o, s = this.sim
        if (ptr.active) {
            var k = Math.max(dt * 60, 0.001)
            ptr.vx = ptr.vx * 0.5 + ((ptr.x - ptr.lastX) / k) * 0.5
            ptr.vy = ptr.vy * 0.5 + ((ptr.y - ptr.lastY) / k) * 0.5
            ptr.lastX = ptr.x
            ptr.lastY = ptr.y
            if (!this.touched && ptr.x >= 0 && ptr.x <= s.w && ptr.y >= 0 && ptr.y <= s.h) {
                this.touched = true
                this.el.dispatchEvent(new CustomEvent("curtaintouch"))
            }
        } else {
            ptr.vx = ptr.vy = 0
        }
        this.acc += dt
        var steps = 0
        while (this.acc >= 1 / 60 && steps < 3) {
            this.time += 1 / 60
            step(s, o, ptr, this.time, this.reduceMotion ? 0 : o.sway)
            this.acc -= 1 / 60
            steps++
        }
        if (steps === 3) this.acc = 0
        this._sounds()
        draw(this.ctx, s, o, this.dpr)
    }

    // Change settings while it runs, e.g. curtain.set({ soundType: "glass", volume: 0.5 })
    ChimeCurtain.prototype.set = function (changes) {
        var rebuild = false
        for (var key in changes) if (REBUILD.indexOf(key) !== -1) rebuild = true
        var imageChanged = "image" in changes && changes.image !== this.o.image
        Object.assign(this.o, changes)
        if (imageChanged) this._setImage()
        if (rebuild) this.sim = null
        this._layout()
    }

    ChimeCurtain.prototype.destroy = function () {
        cancelAnimationFrame(this._raf)
        this._ro.disconnect()
        this._io.disconnect()
        window.removeEventListener("pointermove", this._onMove)
        window.removeEventListener("pointerdown", this._onMove)
        window.removeEventListener("pointerup", this._onUp)
        window.removeEventListener("pointercancel", this._onLeave)
        document.removeEventListener("pointerout", this._onLeave)
        window.removeEventListener("blur", this._onLeave)
        this.img.remove()
        this.canvas.remove()
    }

    ChimeCurtain.unlockAudio = unlockAudio
    window.ChimeCurtain = ChimeCurtain
})()
