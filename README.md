# Israt Zaman Srity — portfolio

**Live:** https://israt24hub.github.io/

My personal site: who I am, what I've built, and how to reach me. It works in English and Bangla (button in the top-right corner).

## What's on the page

- **Hero:** my name in both scripts, and a doorway where the Bangla alphabet hangs like wind chimes. Move the cursor (or a finger) through it and the strands part; press *Turn on sound* to hear them.
- **Selected work:** the CSE445 Bank Marketing study, LeakGuard, Chime Gate and Study Hub, with links to the code and live sites.
- **Experience, education, leadership, interests**, and the BookaholiChael book.

## Editing it

Everything is in `index.html`. Each piece of text appears twice, once in English (`class="lang-en"`) and once in Bangla (`class="lang-bn"`); change both.

- **Show an email address and message form:** find `data-email=""` (search for `EDIT`) and put your email between the quotes.
- **Change the photo:** replace `img/srity-640.jpg`, `img/srity-640.webp` and `img/srity-360.webp` (portrait orientation).
- **Add a project:** copy one `<article class="web-card">` block inside *Also on the web*, change the text, links and screenshot (`img/projects/`, 800×500).

Upload changed files on GitHub (**Add file → Upload files**). The site updates within a minute or two.

## How it's built

Plain HTML, CSS and JavaScript, no frameworks and no build step.

- `js/chime-curtain.js`: the hanging-letter curtain from [Chime Gate](https://github.com/Israt24hub/chime-gate). Verlet rope physics drawn on a canvas, with chime sounds synthesised by the Web Audio API.
- `js/main.js`: language switch, navigation, the hero entrance, the LeakGuard terminal that types its real output, timelines that fill as you scroll, and the book overlay.
- `css/style.css`: layout and motion. All animation turns off when a visitor's system asks for reduced motion.
- Fonts are stored in the repository: Newsreader, Manrope, Noto Sans Bengali and MedievalSharp (all SIL Open Font License).

## License

Code: MIT (see `LICENSE`). My photo and the written content: all rights reserved.
