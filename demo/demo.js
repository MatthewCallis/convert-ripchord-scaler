import { buildRipchord, buildScaler, buildXML, parseText } from '../convert-ripchord-scaler.mjs';

function makeDetail(key, value, keyClass = '', valueClass = '', detailClass = '') {
  const detail = document.createElement('div');
  detail.className = `detail ${detailClass}`;

  const keyNode = document.createElement('div');
  keyNode.className = `key ${keyClass}`;
  keyNode.textContent = key;

  const valueNode = document.createElement('div');
  valueNode.className = `value ${valueClass}`;
  if (typeof value === 'string' || typeof value === 'number') {
    valueNode.textContent = value;
  } else if (value) {
    valueNode.appendChild(value);
  }

  detail.append(keyNode);
  detail.append(valueNode);

  return detail;
}

function createDownloadLink(filename, content) {
  const element = document.createElement('a');
  element.textContent = filename;

  const blob = new Blob([content], { type: 'plain/text' });
  element.setAttribute('href', URL.createObjectURL(blob));
  element.setAttribute('download', filename);

  return element;
}

document.querySelector('#preset-file').addEventListener('change', (e) => {
  const { files } = e.target;
  if (!files || files.length < 1) {
    return;
  }
  for (const file of files) {
    const reader = new FileReader();
    reader.addEventListener('load', (event) => {
      const output = parseText(event.target.result);
      if (!output) {
        return;
      }
      console.log('output:', output);

      const chunkNode = document.createElement('div');
      chunkNode.className ='item';

      chunkNode.appendChild(makeDetail('Type', output.type, '', 'known', ''));
      chunkNode.appendChild(makeDetail('Chords', output.chords.length, '', 'size', ''));

      let download;
      if (output.type === 'ripchord') {
        const built = buildScaler(output);
        const xml = buildXML(built);
        download = createDownloadLink(file.name.replaceAll('.rpc', '.xml'), xml);
        chunkNode.appendChild(makeDetail('Download Scaler', download, '', 'data'));
      } else if (output.type === 'scaler') {
        const built = buildRipchord(output, { generateTrigger: true });
        const xml = buildXML(built);
        download = createDownloadLink(file.name.replaceAll('.xml', '.rpc'), xml);
        chunkNode.appendChild(makeDetail('Download Ripchord', download, '', 'data'));
      }

      // Append Chords
      let i = 0;
      let chords = document.createElement('ul');
      for (const chord of output.chords) {
        const chordNode = document.createElement('li');
        chordNode.textContent = `${i}: ${chord.name}`;
        chords.appendChild(chordNode);
        i++;
      }

      chunkNode.appendChild(makeDetail(`Chords`, chords, '', 'known'));

      document.querySelector('.container .grid').append(chunkNode);

    });
    reader.readAsText(file);
  }
});
