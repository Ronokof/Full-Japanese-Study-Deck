---
layout: default
name: updating
pagetitle: "Updating"
pgname: "updating"
permalink: /updating/
ogsuffix: " - How to Update"
---

<div class="content">
  <h3>Updating (<strong>ALWAYS KEEP BACKUPS!</strong>)</h3>
  <ul>
  <li>Keep in mind that any major (x.0.0) or minor (x.y.0) update may change the deck structure (e.g. subdeck name changes), note type fields order etc. All notes that have been removed from the deck in the past and are not in the latest version will become <em>incompatible</em> after updating. Again, make sure you keep backups, check if everything is ok and (if required) make necessary changes before updating!</li>
  <li>If you find out there are incompatible notes, search <em>-tag:fjsd_version::{{ site.deckversion }}</em> <strong>WHILE HAVING THE DECK SELECTED</strong> in the Anki browser ("Browse" window) and delete all notes that were found.</li>
  <li>To apply the update, simply import the new deck over the old one with the following options set:<table>
      <tr>
         <th>Option</th>
         <th>Value</th>
         <th>Notes</th>
      </tr>
       <tr>
         <td>Import any learning progress</td>
         <td>Disabled</td>
         <td>-</td>
      </tr>
      <tr>
         <td>Import any deck presets</td>
         <td>Disabled</td>
         <td>-</td>
       </tr>
      <tr>
         <td>Merge note types</td>
         <td>Enabled</td>
         <td>-</td>
      </tr>
      <tr>
        <td>Update notes</td>
        <td>Always</td>
        <td>-</td>
      </tr>
      <tr>
        <td>Update note types</td>
        <td>Always / Never</td>
        <td><em>Always</em> if you want note type updates. <strong>(RECOMMENDED)</strong><br><br><em>Never</em> if you want to keep custom note
          type changes (modified CSS/HTML, additional text etc.).</td>
      </tr>
    </table>
  </li>
  </ul>
</div>