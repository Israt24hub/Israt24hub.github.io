/*
 * Portfolio behaviour: language switch, navigation, the hero doorway, scroll effects,
 * the LeakGuard terminal, the contact form and the BookaholiChael book.
 * Plain JavaScript, no libraries. Everything respects "reduce motion".
 */
;(function () {
    "use strict"

    var doc = document.documentElement
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    var $ = function (sel, root) { return (root || document).querySelector(sel) }
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)) }
    var lang = function () { return doc.getAttribute("data-lang") === "bn" ? "bn" : "en" }
    var BN_DIGITS = "০১২৩৪৫৬৭৮৯"
    var toBn = function (s) { return String(s).replace(/\d/g, function (d) { return BN_DIGITS[d] }) }

    /* ------------------------------------------------------------------ */
    /* Language                                                             */
    /* ------------------------------------------------------------------ */
    var langBtn = $("#lang-toggle")
    function labelLangButton() {
        langBtn.setAttribute("aria-label", lang() === "en" ? "Show this page in Bangla" : "পেজটি ইংরেজিতে দেখুন")
    }
    function applyLang(next) {
        doc.setAttribute("data-lang", next)
        doc.lang = next
        try { localStorage.setItem("portfolio-lang", next) } catch (e) {}
        labelLangButton()
        moveIndicator()
        updateTimelines()
    }
    langBtn.addEventListener("click", function () {
        var next = lang() === "en" ? "bn" : "en"
        if (reduce) return applyLang(next)
        doc.classList.add("lang-switching")
        setTimeout(function () {
            applyLang(next)
            requestAnimationFrame(function () { doc.classList.remove("lang-switching") })
        }, 150)
    })
    labelLangButton()

    /* ------------------------------------------------------------------ */
    /* Navigation: background on scroll, current section, phone menu        */
    /* ------------------------------------------------------------------ */
    var nav = $(".nav")
    var menuBtn = $("#menu-btn")
    var links = $$(".nav-links a")
    var indicator = $(".nav-indicator")
    var targets = links.map(function (a) { return document.querySelector(a.hash) })
    var current = null

    function moveIndicator() {
        if (!current || window.innerWidth <= 900) {
            indicator.style.opacity = "0"
            return
        }
        indicator.style.width = current.offsetWidth + "px"
        indicator.style.transform = "translateX(" + current.offsetLeft + "px)"
        indicator.style.opacity = "1"
    }
    function findSection() {
        var line = window.innerHeight * 0.35
        var found = null
        targets.forEach(function (sec, i) {
            if (sec && sec.getBoundingClientRect().top <= line) found = links[i]
        })
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) found = links[links.length - 1]
        if (found !== current) {
            if (current) current.classList.remove("is-active")
            current = found
            if (current) current.classList.add("is-active")
            moveIndicator()
        }
    }
    function setMenu(open) {
        nav.classList.toggle("menu-open", open)
        menuBtn.setAttribute("aria-expanded", open ? "true" : "false")
    }
    menuBtn.addEventListener("click", function () { setMenu(!nav.classList.contains("menu-open")) })
    links.forEach(function (a) { a.addEventListener("click", function () { setMenu(false) }) })
    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && nav.classList.contains("menu-open")) {
            setMenu(false)
            menuBtn.focus()
        }
    })
    document.addEventListener("click", function (e) {
        if (nav.classList.contains("menu-open") && !nav.contains(e.target)) setMenu(false)
    })

    /* ------------------------------------------------------------------ */
    /* Timelines fill as you read down them                                 */
    /* ------------------------------------------------------------------ */
    var timelines = $$(".timeline")
    function updateTimelines() {
        var mark = window.innerHeight * 0.62
        timelines.forEach(function (tl) {
            var r = tl.getBoundingClientRect()
            if (!r.height) return
            var p = reduce ? 1 : Math.max(0, Math.min(1, (mark - r.top) / r.height))
            tl.style.setProperty("--progress", p.toFixed(3))
            $$(".tl-item", tl).forEach(function (item) {
                item.classList.toggle("is-lit", reduce || item.getBoundingClientRect().top + 12 <= mark)
            })
        })
    }

    var ticking = false
    function onScroll() {
        if (ticking) return
        ticking = true
        requestAnimationFrame(function () {
            ticking = false
            nav.classList.toggle("is-scrolled", window.scrollY > 8)
            findSection()
            updateTimelines()
        })
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", function () { moveIndicator(); onScroll() })
    onScroll()

    /* ------------------------------------------------------------------ */
    /* Scroll reveal                                                        */
    /* ------------------------------------------------------------------ */
    var revealEls = $$("[data-reveal]")
    if (reduce || !("IntersectionObserver" in window)) {
        revealEls.forEach(function (el) { el.classList.add("is-in") })
    } else {
        var revealer = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) {
                    en.target.classList.add("is-in")
                    revealer.unobserve(en.target)
                }
            })
        }, { rootMargin: "0px 0px -6% 0px", threshold: 0.12 })
        revealEls.forEach(function (el) { revealer.observe(el) })
    }

    /* ------------------------------------------------------------------ */
    /* Hero: the Bangla alphabet hanging in a doorway                       */
    /* ------------------------------------------------------------------ */
    // vowels and consonants, one code point each so every bead is a whole letter
    var ALPHABET = "অআইঈউঊঋএঐওঔকখগঘঙচছজঝঞটঠডঢণতথদধনপফবভমযরলশষসহড়ঢ়য়ৎ"
    var arch = $("#hero-arch")
    var archPath = $(".arch-line path", arch)
    var heroCurtain = null
    var userMoved = false
    window.addEventListener("pointermove", function () { userMoved = true }, { once: true, passive: true })

    function archRise(el) {
        return ((el.clientWidth / 2) / Math.max(1, el.clientHeight)) * 100
    }
    function drawArchLine() {
        var w = arch.clientWidth, h = arch.clientHeight, i = 0.75, r = w / 2
        var svg = archPath.ownerSVGElement
        svg.setAttribute("viewBox", "0 0 " + w + " " + h)
        archPath.setAttribute("d", "M" + i + " " + h + "V" + r + "A" + (r - i) + " " + (r - i) + " 0 0 1 " + (w - i) + " " + r + "V" + h)
        archPath.setAttribute("pathLength", "1")
    }
    function startHeroCurtain() {
        if (!window.ChimeCurtain || heroCurtain) return
        heroCurtain = new ChimeCurtain(arch, {
            text: ALPHABET,
            fontFamily: '"Noto Sans Bengali", "Nirmala UI", "Vrinda", sans-serif',
            color: "rgba(196, 181, 253, 0.92)",
            accentColor: "#F0ABFC",
            accentAmount: 0.16,
            doorShade: "rgba(30, 27, 75, 0.38)",
            archHeight: archRise(arch),
            fontSize: 15,
            letterSpacing: 1.6,
            lineHeight: 1.1,
            density: 1,
            gravity: 0.7,
            interact: 2.6,
            radius: 46,
            sway: 0.35,
            sound: false,
            soundType: "chime",
            volume: 0.6,
        })
        heroCurtain.canvas.style.touchAction = "pan-y" // let phones scroll the page with an up/down swipe
        new ResizeObserver(function () {
            drawArchLine()
            heroCurtain.set({ archHeight: archRise(arch) })
        }).observe(arch)
    }
    // On load a hand brushes through once, so visitors see that the strands move.
    function introSweep() {
        if (reduce || !heroCurtain) return
        var ptr = heroCurtain.ptr
        var w = arch.clientWidth, h = arch.clientHeight
        var t0 = performance.now(), dur = 1700
        ptr.x = ptr.lastX = -60
        ptr.y = ptr.lastY = h * 0.6
        ;(function frame(now) {
            if (userMoved) return
            var p = Math.min(1, (now - t0) / dur)
            var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
            ptr.active = true
            ptr.x = -60 + (w + 120) * e
            ptr.y = h * (0.62 - 0.1 * Math.sin(p * Math.PI))
            if (p < 1) requestAnimationFrame(frame)
            else ptr.active = false
        })(t0)
    }

    var heroSound = $("#hero-sound")
    function labelSound(btn, on) {
        btn.setAttribute("aria-pressed", on ? "true" : "false")
        $$("[data-on]", btn).forEach(function (s) { s.textContent = on ? s.getAttribute("data-on") : s.getAttribute("data-off") })
    }
    heroSound.addEventListener("click", function () {
        if (!heroCurtain) return
        var on = !heroCurtain.o.sound
        heroCurtain.set({ sound: on })
        if (on) ChimeCurtain.unlockAudio()
        labelSound(heroSound, on)
    })

    drawArchLine()
    var fontsReady = document.fonts && document.fonts.load
        ? Promise.race([document.fonts.load('15px "Noto Sans Bengali"', "ক"), new Promise(function (r) { setTimeout(r, 1500) })])
        : Promise.resolve()
    var pageFonts = document.fonts ? Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 800) })]) : Promise.resolve()

    pageFonts.then(function () {
        requestAnimationFrame(function () { doc.classList.add("is-ready") })
    })
    fontsReady.then(function () {
        startHeroCurtain()
        if (reduce) return
        setTimeout(function () { arch.classList.add("is-unrolled") }, 450)
        setTimeout(introSweep, 1500)
    })

    /* ------------------------------------------------------------------ */
    /* LeakGuard terminal types its output when it scrolls into view        */
    /* ------------------------------------------------------------------ */
    var term = $("[data-terminal]")
    if (term && !reduce && "IntersectionObserver" in window) {
        term.classList.add("is-typing")
        var lines = $$(".t-line", term)
        var cmd = lines[0]
        var cmdText = cmd.lastChild
        var full = cmdText.textContent
        cmdText.textContent = ""
        var termIO = new IntersectionObserver(function (entries) {
            if (!entries[0].isIntersecting) return
            termIO.disconnect()
            typeCommand()
        }, { threshold: 0.45 })
        termIO.observe(term)

        var typeCommand = function () {
            var caret = document.createElement("span")
            caret.className = "t-caret"
            caret.style.visibility = "visible"
            cmd.classList.add("is-shown")
            cmd.appendChild(caret)
            var i = 0
            ;(function next() {
                i += 2
                cmdText.textContent = full.slice(0, i)
                if (i < full.length) setTimeout(next, 26)
                else setTimeout(function () { caret.remove(); showLines(1) }, 420)
            })()
        }
        var showLines = function (k) {
            if (k >= lines.length) {
                term.classList.remove("is-typing")
                return
            }
            lines[k].classList.add("is-shown")
            var pause = k === 2 ? 650 : lines[k].textContent.trim() ? 120 : 60 // a beat while the scan "runs"
            setTimeout(function () { showLines(k + 1) }, pause)
        }
    }

    /* ------------------------------------------------------------------ */
    /* Contact: email + message form appear once an address is set          */
    /* ------------------------------------------------------------------ */
    var contact = $("#contact")
    var email = (contact.getAttribute("data-email") || "").trim()
    if (email) {
        var emailLink = $("#email-link")
        emailLink.href = "mailto:" + email
        $(".email-text", emailLink).textContent = email
        emailLink.hidden = false
        var form = $("#contact-form")
        form.hidden = false
        form.addEventListener("submit", function (e) {
            e.preventDefault()
            var name = form.name.value.trim()
            var from = form.email.value.trim()
            var subject = "Message from " + name + " (portfolio)"
            var body = form.message.value.trim() + "\n\n" + name + "\n" + from
            window.location.href = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body)
        })
    }

    /* ------------------------------------------------------------------ */
    /* Footer year                                                          */
    /* ------------------------------------------------------------------ */
    var year = new Date().getFullYear()
    $$(".footer .year").forEach(function (el) {
        el.textContent = el.closest(".lang-bn") ? toBn(year) : String(year)
    })

    /* ------------------------------------------------------------------ */
    /* BookaholiChael: the book opens behind a curtain of its own name      */
    /* ------------------------------------------------------------------ */
    var book = $("#book")
    var openBtn = $("#open-book")
    var closeBtn = $("#book-close")
    var bookArch = $("#book-arch")
    var bookSound = $("#book-sound")
    var bookCurtain = null
    var bookSoundOn = false
    var lastFocus = null
    var closeTimer = null

    function openBook() {
        clearTimeout(closeTimer)
        lastFocus = document.activeElement
        book.hidden = false
        document.body.style.overflow = "hidden"
        requestAnimationFrame(function () {
            book.classList.add("is-open")
        })
        if (window.ChimeCurtain && !bookCurtain) {
            bookCurtain = new ChimeCurtain(bookArch, {
                text: "BOOKAHOLICHAEL ✦ ",
                fontFamily: '"MedievalSharp", Georgia, serif',
                color: "rgba(243, 217, 164, 0.55)",
                accentColor: "rgba(240, 171, 252, 0.6)",
                accentAmount: 0.18,
                doorShade: "rgba(70, 16, 34, 0.4)",
                archHeight: archRise(bookArch),
                fontSize: 14,
                letterSpacing: 1.45,
                lineHeight: 1.0,
                density: 1,
                gravity: 0.7,
                interact: 2.6,
                radius: 44,
                sway: 0.4,
                sound: bookSoundOn,
                soundType: "glass",
                volume: 0.6,
            })
            bookCurtain.canvas.style.touchAction = "pan-y"
        }
        closeBtn.focus()
    }
    function closeBook() {
        book.classList.remove("is-open")
        document.body.style.overflow = ""
        closeTimer = setTimeout(function () {
            book.hidden = true
            if (bookCurtain) {
                bookCurtain.destroy()
                bookCurtain = null
            }
        }, reduce ? 0 : 450)
        if (lastFocus) lastFocus.focus()
    }
    openBtn.addEventListener("click", openBook)
    closeBtn.addEventListener("click", closeBook)
    bookSound.addEventListener("click", function () {
        bookSoundOn = !bookSoundOn
        if (bookCurtain) bookCurtain.set({ sound: bookSoundOn })
        if (bookSoundOn) ChimeCurtain.unlockAudio()
        labelSound(bookSound, bookSoundOn)
    })
    // clicking the dark area outside the curtain closes the book
    book.addEventListener("click", function (e) {
        if (e.target !== book) return
        var r = bookArch.getBoundingClientRect()
        var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
        if (!inside) closeBook()
    })
    book.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            e.preventDefault()
            closeBook()
            return
        }
        if (e.key !== "Tab") return
        var focusables = $$("button, a[href]", book).filter(function (el) { return el.offsetParent !== null || el === closeBtn })
        if (!focusables.length) return
        var first = focusables[0], last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault()
            last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault()
            first.focus()
        }
    })
})()
