import { XMLBuilder, XMLParser, XMLValidator } from 'fast-xml-parser';
import { v4 as uuidv4 } from 'uuid';
import { Chord, Midi } from 'tonal';

// {
//   "info": {
//     "empty": false,
//     "name": "E ",
//     "setNum": 2386,
//     "chroma": "100101010010",
//     "normalized": "100101001010",
//     "intervals": [
//       "1P",
//       "3m",
//       "5P",
//       "7m",
//       "11P"
//     ],
//     "quality": "Minor",
//     "aliases": [
//       "m7add11",
//       "m7add4"
//     ],
//     "symbol": "Em7add11",
//     "type": "",
//     "root": "",
//     "rootDegree": 0,
//     "tonic": "E",
//     "notes": [
//       "E",
//       "G",
//       "B",
//       "D",
//       "A"
//     ]
//   },
//   "name": "Em7add11 / G6/9/E / A11/E / A9sus4/E",
//   "notes": [
//     {
//       "value": "40",
//       "note": "E2"
//     },
//     {
//       "value": "55",
//       "note": "G3"
//     },
//     {
//       "value": "59",
//       "note": "B3"
//     },
//     {
//       "value": "62",
//       "note": "D4"
//     },
//     {
//       "value": "64",
//       "note": "E4"
//     },
//     {
//       "value": "69",
//       "note": "A4"
//     }
//   ],
//   "trigger": "48"
// }

export const builder = new XMLBuilder({
  processEntities: false,
  format: true,
  ignoreAttributes: false,
});

export const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: true,
});

/**
 * @param data
 * @param root0
 * @param root0.sharps
 */
export function parseText(data, { sharps = true } = {}) {
  // Validate
  const result = XMLValidator.validate(data);
  if (result?.err) {
    console.log(`XML is invalid becuause of - ${result.err.msg}`, result);
    return;
  }

  const json = parser.parse(data);
  if (json.ripchord) {
    return parseRipchord(json, { sharps });
  }
  if (json.CHORDSET) {
    return parseScaler(json, { sharps });
  }
}

/**
 * @param json
 * @param root0
 * @param root0.sharps
 */
export function parseRipchord(json, { sharps = true } = {}) {
  // console.log('parseRipchord:', JSON.stringify(json, null, 2));
  const data = {
    chords: [],
    type: 'ripchord',
    uuid: '',
    version: '',
  };

  // Missing the container node.
  if (!json?.ripchord?.preset?.input) {
    console.log('Not a Ripchord file.');
    return data;
  }

  // Metadata
  data.uuid = uuidv4();

  // Read the keys from the data and detect the chords
  for (const { chord, '@_note': trigger } of json.ripchord.preset.input) {
    const notes = chord['@_notes'].split(';').map((value) => ({ value, note: Midi.midiToNoteName(value, { sharps }) }));
    // console.log('notes', notes);
    const name = Chord.detect(notes.map(({ note }) => note));
    // console.log('name', name);
    const info = Chord.get(name[0]);
    // console.log('info', info);

    data.chords.push({
      info,
      name: chord['@_name'] || name.join(' / ') || notes.map(({ note }) => note).join(' + '),
      notes,
      trigger,
    });
  }

  // console.log('parseRipchord:', data);
  return data;
}

/**
 * @param json
 * @param root0
 * @param root0.sharps
 */
export function parseScaler(json, { sharps = true } = {}) {
  // console.log('parseScaler:', json);
  const data = {
    chords: [],
    type: 'scaler',
    uuid: '',
    version: '',
  };

  // Missing the container node.
  if (!json.CHORDSET?.CHORD) {
    console.log('Not a Scaler file.');
    return data;
  }

  // Set Metadata
  data.uuid = json.CHORDSET['@_uuid'];
  data.version = json.CHORDSET['@_version'];

  // Read the keys from the data and detect the chords
  for (const chord of json.CHORDSET.CHORD) {
    const notes = chord.NOTE.map(({ '@_MIDI': value }) => ({ value, note: Midi.midiToNoteName(value, { sharps }) }));
    // console.log('notes', notes.map(({ value }) => value));
    const name = Chord.detect(notes.map(({ note }) => note));
    // console.log('name', name);
    const info = Chord.get(name[0]);
    // console.log('info', info);

    data.chords.push({
      info,
      name: name.join(' / ') || notes.map(({ note }) => note).join(' + '),
      notes,
      trigger: '',
    });
  }

  // console.log('parseScaler:', data);
  return data;
}

/**
 * @param data
 */
export function buildXML(data) {
  let output = builder.build(data);

  // Make Ripchord chord nodes self closing.
  output = output.replaceAll('"></NOTE>', '"/>');
  output = output.replaceAll('"></chord>', '"/>');

  return output;
}

/**
 * @param data
 * @param root0
 * @param root0.generateTrigger
 * @param root0.startValue
 */
export function buildRipchord(data, { generateTrigger = false, startValue = 48 } = {}) {
  const output = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    ripchord: {
      preset: {
        input: [],
      },
    },
  };

  // Start from C3 / 48
  let generatedTrigger;
  if (generateTrigger) {
    generatedTrigger = startValue;
  }

  for (const { name, notes, trigger } of data.chords) {
    output.ripchord.preset.input.push({
      chord: {
        '@_name': name,
        '@_notes': notes.map(({ value }) => value).join(';'),
      },
      '@_note': trigger && !generateTrigger ? String(trigger) : String(generatedTrigger),
    });
    if (generateTrigger) {
      generatedTrigger += 1;
    }
  }

  return output;
}

/**
 * @param data
 */
export function buildScaler(data) {
  const output = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    CHORDSET: {
      CHORD: [],
      '@_version': data.version || '2',
      '@_uuid': data.uuid,
    },
  };

  // Scaler only accepts notes, information is parsed in app and there is no trigger.
  for (const { name, notes, trigger } of data.chords) {
    output.CHORDSET.CHORD.push({
      NOTE: notes.map(({ value }) => ({ '@_MIDI': String(value) })),
    });
  }

  return output;
}
