# Israt Zaman Srity — portfolio

**Live:** https://israt24hub.github.io/

My personal site: who I am, what I've built, and how to reach me. It's in six languages, chosen from the menu in the top-right corner: English, বাংলা (Bangla), हिन्दी (Hindi), Deutsch, Italiano and Español. The page remembers the visitor's choice.

## What's on the page

- **Hero:** my name in Latin and Bangla script (ইসরাত জামান স্মৃতি), and a doorway where six words (curiosity, code, books, language, data, learning) hang like wind chimes, in whichever language the page is showing. Move the cursor (or a finger) through them and the strands part; press *Turn on sound* to hear them.
- **Selected work:** the CSE445 Bank Marketing study, LeakGuard, Chime Gate and Study Hub, with links to the code and live sites.
- **Experience, education, leadership, interests**, and the BookaholiChael book.

## Editing it

English text is written directly in `index.html`. The other five languages are in `js/i18n.js`. Every translated element has a key, such as `data-i18n="about.2"`, and the same key appears once in each language block of `js/i18n.js`. When you change a sentence in English, change the same key in the other languages too (or delete that key from a language, and the English shows instead).

- **Change the curtain words:** edit `"chimes.words"` in `js/i18n.js` (English is in the `en` block at the top). Keep the ` ✦ ` between words.
- **Translations were written with AI help.** Ask a native speaker to read the Hindi, German, Italian and Spanish versions before you rely on them.

- **Show an email address and message form:** find `data-email=""` (search for `EDIT`) and put your email between the quotes.
- **Change the photo:** replace `img/srity-640.jpg`, `img/srity-640.webp` and `img/srity-360.webp` (portrait orientation).
- **Add a project:** copy one `<article class="web-card">` block inside *Also on the web*, change the text, links and screenshot (`img/projects/`, 800×500).

Upload changed files on GitHub (**Add file → Upload files**). The site updates within a minute or two.

## How it's built

Plain HTML, CSS and JavaScript, no frameworks and no build step.

- `js/chime-curtain.js`: the hanging-letter curtain from [Chime Gate](https://github.com/Israt24hub/chime-gate). Verlet rope physics drawn on a canvas, with chime sounds synthesised by the Web Audio API.
- `js/i18n.js`: the Bangla, Hindi, German, Italian and Spanish text.
- `js/main.js`: the language menu (it also changes the curtain words), navigation, the hero entrance, the LeakGuard terminal that types its real output, timelines that fill as you scroll, and the book overlay.
- `css/style.css`: layout and motion. All animation turns off when a visitor's system asks for reduced motion.
- Fonts are stored in the repository: Newsreader, Manrope, Noto Sans Bengali, Noto Sans Devanagari and MedievalSharp (all SIL Open Font License).

## License

Code: MIT (see `LICENSE`). My photo and the written content: all rights reserved.
