import {extractEmbedUrl} from './anisaturn';

const page = `<html><body>
  <iframe id="watch-iframe" src="https://play.saturncdn.net/embed/84648?token=a1b2c3&amp;expires=1795825117" allowfullscreen></iframe>
</body></html>`;

const expected =
  'https://play.saturncdn.net/embed/84648?token=a1b2c3&expires=1795825117';

test('extracts and decodes the watch iframe', () => {
  expect(extractEmbedUrl(page)).toBe(expected);
});

test('falls back to the initialVideoUrl in the x-data attribute', () => {
  const html = `<div x-data='{"initialVideoUrl":"https:\\/\\/play.saturncdn.net\\/embed\\/84648?token=a1b2c3\\u0026expires=1795825117"}'></div>`;
  expect(extractEmbedUrl(html)).toBe(expected);
});

test('returns null when there is no player', () => {
  expect(extractEmbedUrl('<html><body>nope</body></html>')).toBeNull();
});
