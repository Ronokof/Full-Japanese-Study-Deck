# Contributing

First off, thank you for even thinking about contributing! Whether you’re fixing typos in a card, tweaking the deck builder, reporting issues or requesting a feature, your help is always welcome!

---

## Setup

1. **Clone** the repo and `cd` into the resulting directory.
2. Copy `.env_template` to `.env` and fill in any AWS details if you want to generate or regenerate audio.
3. **Install dependencies**
 ```bash
 npm install
 ```
4. Follow the instructions in each subfolder’s *README.md* file.
5. (Optional) Make any changes to the code or notes.
6. **Run the builder (and test if everything works perfectly, if you made changes)**
 ```bash
 npm run start
 # or
 npm run start-with-audio # if you want to generate audio
 ```

## Reporting Issues

### **Note errors**
  - For JMDict and KANJIDIC data: Please consult the original sources and either make corrections yourself or submit a correction request. I am not responsible for any mistakes in the data I have used. Every now and then I will update the deck with the latest data.
  - For Kanji mnemonics, grammar and radicals data: Submit a PR (see [Submitting Pull Requests](#submitting-pull-requests)).

### **Feature requests** (new subdeck, improved filtering, code optimization etc.)
  - Describe your idea, use-cases, and any preliminary approach.
  - If your request involves code changes, note or note type changes, submit a PR instead of opening an issue (see [Submitting Pull Requests](#submitting-pull-requests)).

### **Security vulnerabilities**
  - See [SECURITY.md](https://github.com/Ronokof/Full-Japanese-Study-Deck/blob/main/SECURITY.md).

---

## Submitting Pull Requests

1. **Fork** the repo.
2. Create a branch off `main` named `fix/<short-description>` or `feat/<short-description>`.
3. Follow [Setup](#setup) (optional; if you only add a mnemonic or correct some notes, you can skip this).
4. Make your changes against that branch and push everything to the remote forked repo.
5. Submit a PR from that new branch and link any relevant issue(s).

### Your PR should include:

- A clear title, describing your changes in as very little details as possible (e.g. "Fixed typo in a JLPT N4 grammar note", "Added mnemonic for 鬱").
- A description of **what** you changed and **why**.
- (If applicable) Screenshots or examples of the changes.

---

## Discussion & Support
  - For complex questions or roadmap ideas, use [Discussions](https://github.com/Ronokof/Full-Japanese-Study-Deck/discussions).
  - General Anki usage or language immersion tips belong on [Anki Forums](https://forums.ankiweb.net/) or [r/LearnJapanese](https://www.reddit.com/r/LearnJapanese/). Keep this repository focused only on the deck and the deck builder.

## License & Code of Conduct
  - By contributing, you agree that your work will be licensed under and must comply with this repository’s [LICENSE.md](https://github.com/Ronokof/Full-Japanese-Study-Deck/blob/main/LICENSE.md).
  - Please also respect the [Code of Conduct](https://github.com/Ronokof/Full-Japanese-Study-Deck/blob/main/CODE_OF_CONDUCT.md).