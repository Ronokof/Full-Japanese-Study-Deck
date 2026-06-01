---
layout: default
name: contents
pagetitle: "Deck Contents"
pgname: "contents"
permalink: /contents/
ogsuffix: " - Contents"
---

<div class="content">
  <h2>Deck Contents</h2>
  <h3><strong>Kana</strong> (reference material)</h3>
  <ul>
    <li><strong>Basic kana</strong> (Hiragana & Katakana) — {{ site.kana }} characters with readings and audio.</li>
    <li><strong>Extended kana</strong> — {{ site.kanaextended }} combinations (<em>ja, kya, gyu</em>, etc.), including uncommon ones.
    </li>
  </ul>
  <h3><strong>Core 10k</strong> (intended for learning through spaced repetition)</h3>
  <ul>
    <li><strong>Vocabulary</strong> — {{ site.corevocab }} common & useful words, including JLPT-specific ones.</li>
    <li><strong>Kanji</strong> — {{ site.corekanji }} common kanji, categorized by JLPT level.</li>
    <li>JLPT source: <a target="_blank" href="https://www.tanos.co.uk/jlpt/">tanos.co.uk JLPT Resources</a></li>
  </ul>
  <h3><strong>Grammar</strong> (intended for learning through spaced repetition & reference material)</h3>
  <ul>
    <li><strong>{{ site.grammar }} grammar points</strong> — organized by JLPT level, with additional non-JLPT ones.</li>
    <li>Source: <a target="_blank" href="https://jgram.org/">JGram</a></li>
  </ul>
  <h3><strong>Kanji Radicals</strong> (reference material)</h3>
  <ul>
    <li><strong>{{ site.radicals }} radicals</strong> — foundational for kanji recognition.</li>
    <li>Source: <a target="_blank" href="https://takoboto.jp/lists/study/radicals/">Takoboto's radicals list</a>
    </li>
  </ul>
  <h3><strong>Kana-Only Vocabulary</strong> (reference & <a target="_blank"
      href="https://www.youtube.com/watch?v=jg09lNupc1s">ready-made</a> mining material)
    <span class="info">
      <i class="fas fa-circle-info"></i>
      <span class="tooltip">The number of entries will always change due to dictionary updates or selection logic
        modifications.</span>
    </span>
  </h3>
  <ul>
    <li><strong>{{ site.kanaonlywords }} common words</strong> — written entirely in kana.</li>
  </ul>
  <h3><strong>Extra Common Kanji Collection</strong> (reference & <a target="_blank"
      href="https://www.youtube.com/watch?v=jg09lNupc1s">ready-made</a> mining material)
    <span class="info">
      <i class="fas fa-circle-info"></i>
      <span class="tooltip">The number of entries will always change due to dictionary updates or selection logic
        modifications.</span>
    </span>
  </h3>
  <ul>
    <li><strong>{{ site.extrakanji }} extra kanji</strong> — found in frequently used words.</li>
    <li><strong>{{ site.extrakanjiwords }} words</strong> — each linked to relevant kanji from both the extra kanji collection and Core
      kanji deck.</li>
  </ul>
  <div class="card-previews-section">
    <h2 class="card-previews-header">Card Previews</h2>
    <table class="preview-table">
      <tr>
        <th>Kana</th>
        <td>
          <div class="preview-img-wrapper">
            <img src="{{ site.baseurl }}{{ site.kanapath }}" alt="Kana card preview">
          </div>
        </td>
      </tr>
      <tr>
        <th>Kanji</th>
        <td>
          <div class="preview-img-wrapper">
            <img src="{{ site.baseurl }}{{ site.kanjipath }}" alt="Kanji card preview">
          </div>
        </td>
      </tr>
      <tr>
        <th>Radical</th>
        <td>
          <div class="preview-img-wrapper">
            <img src="{{ site.baseurl }}{{ site.radicalpath }}" alt="Radical card preview">
          </div>
        </td>
      </tr>
      <tr>
        <th>Word</th>
        <td>
          <div class="preview-img-wrapper">
            <img src="{{ site.baseurl }}{{ site.wordpath }}" alt="Word card preview">
          </div>
        </td>
      </tr>
      <tr>
        <th>Grammar</th>
        <td>
          <div class="preview-img-wrapper">
            <img src="{{ site.baseurl }}{{ site.grammarpath }}" alt="Grammar card preview">
          </div>
        </td>
      </tr>
    </table>
  </div>
</div>