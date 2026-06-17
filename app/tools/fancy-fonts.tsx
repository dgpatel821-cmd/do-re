import React, { useState, useEffect, useMemo } from 'react';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Copy, Sparkles, Trash2 } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// Comprehensive Font Style Definitions (Unicode based)
const FONT_STYLES = [
  { id: 'math-bold', name: 'Mathematical Bold', map: { a: '𝐚', b: '𝐛', c: '𝐜', d: '𝐝', e: '𝐞', f: '𝐟', g: '𝐠', h: '𝐡', i: '𝐢', j: '𝐣', k: '𝐤', l: '𝐥', m: '𝐦', n: '𝐧', o: '𝐨', p: '𝐩', q: '𝐪', r: '𝐫', s: '𝐬', t: '𝐭', u: '𝐮', v: '𝐯', w: '𝐰', x: '𝐱', y: '𝐲', z: '𝐳', A: '𝐀', B: '𝐁', C: '𝐂', D: '𝐃', E: '𝐄', F: '𝐅', G: '𝐆', H: '𝐇', I: '𝐈', J: '𝐉', K: '𝐊', L: '𝐋', M: '𝐌', N: '𝐍', O: '𝐎', P: '𝐏', Q: '𝐐', R: '𝐑', S: '𝐒', T: '𝐓', U: '𝐔', V: '𝐕', W: '𝐖', X: '𝐗', Y: '𝐘', Z: '𝐙' } },
  { id: 'math-italic', name: 'Mathematical Italic', map: { a: '𝘢', b: '𝘣', c: '𝘤', d: '𝘥', e: '𝘦', f: '𝘧', g: '𝘨', h: '𝘩', i: '𝘪', j: '𝘫', k: '𝘬', l: '𝘭', m: '𝘮', n: '𝘯', o: '𝘰', p: '𝘱', q: '𝘲', r: '𝘳', s: '𝘴', t: '𝘵', u: '𝘶', v: '𝘷', w: '𝘸', x: '𝘹', y: '𝘺', z: '𝘻', A: '𝘈', B: '𝘉', C: '𝘊', D: '𝘋', E: '𝘌', F: '𝘍', G: '𝘎', H: '𝘏', I: '𝘐', J: '𝘑', K: '𝘒', L: '𝘓', M: '𝘔', N: '𝘕', O: '𝘖', P: '𝘗', Q: '𝘘', R: '𝘙', S: '𝘚', T: '𝘛', U: '𝘜', V: '𝘝', W: '𝘞', X: '𝘟', Y: '𝘠', Z: '𝘡' } },
  { id: 'bold-italic', name: 'Bold Italic', map: { a: '𝒂', b: '𝒃', c: '𝒄', d: '𝒅', e: '𝒆', f: '𝒇', g: '𝒈', h: '𝒉', i: '𝒊', j: '𝒋', k: '𝒌', l: '𝒍', m: '𝒎', n: '𝒏', o: '𝒐', p: '𝒑', q: '𝒒', r: '𝒓', s: '𝒔', t: '𝒕', u: '𝒖', v: '𝒗', w: '𝒘', x: '𝒙', y: '𝒚', z: '𝒛', A: '𝑨', B: '𝑩', C: '𝑪', D: '𝑫', E: '𝑬', F: '𝑭', G: '𝑮', H: '𝑯', I: '𝑰', J: '𝑱', K: '𝑲', L: '𝑳', M: '𝑴', N: '𝑵', O: '𝑶', P: '𝑷', Q: '𝑸', R: '𝑹', S: '𝑺', T: '𝑻', U: '𝑼', V: '𝑽', W: '𝑾', X: '𝑿', Y: '𝒀', Z: '𝒁' } },
  { id: 'cursive', name: 'Royal Cursive', map: { a: '𝒶', b: '𝒷', c: '𝒸', d: '𝒹', e: '𝑒', f: '𝒻', g: '𝑔', h: '𝒽', i: '𝒾', j: '𝒿', k: '𝓀', l: '𝓁', m: '𝓂', n: '𝓃', o: '𝑜', p: '𝓅', q: '𝓆', r: '𝓇', s: '𝓈', t: '𝓉', u: '𝓊', v: '𝓋', w: '𝓌', x: '𝓍', y: '𝓎', z: '𝓏', A: '𝒜', B: 'ℬ', C: '𝒞', D: '𝒟', E: '𝐸', F: 'ℱ', G: '𝒢', H: 'ℋ', I: 'ℐ', J: '𝒥', K: '𝒦', L: 'ℒ', M: 'ℳ', N: '𝒩', O: '𝒪', P: '𝒫', Q: '𝒬', R: 'ℛ', S: '𝒮', T: '𝒯', U: '𝒰', V: '𝒱', W: '𝒲', X: '𝒳', Y: '𝒴', Z: '𝒵' } },
  { id: 'bold-cursive', name: 'Bold Cursive', map: { a: '𝓪', b: '𝓫', c: '𝓬', d: '𝓭', e: '𝓮', f: '𝓯', g: '𝓰', h: '𝓱', i: '𝓲', j: '𝓳', k: '𝓴', l: '𝓵', m: '𝓶', n: '𝓷', o: '𝓸', p: '𝓹', q: '𝓺', r: '𝓻', s: '𝓼', t: '𝓽', u: '𝓾', v: '𝓿', w: '𝔀', x: '𝔁', y: '𝔂', z: '𝔃', A: '𝓐', B: '𝓑', C: '𝓒', D: '𝓓', E: '𝓔', F: '𝓕', G: '𝓖', H: '𝓗', I: '𝓘', J: '𝓙', K: '𝓚', L: '𝓛', M: '𝓜', N: '𝓝', O: '𝓞', P: '𝓟', Q: '𝓠', R: '𝓡', S: '𝓢', T: '𝓣', U: '𝓤', V: '𝓥', W: '𝓦', X: '𝓧', Y: '𝓨', Z: '𝓩' } },
  { id: 'bubble', name: 'Bubble Wrap', map: { a: 'ⓐ', b: 'ⓑ', c: 'ⓒ', d: 'ⓓ', e: 'ⓔ', f: 'ⓕ', g: 'ⓖ', h: 'ⓗ', i: 'ⓘ', j: 'ⓙ', k: 'ⓚ', l: 'ⓛ', m: 'ⓜ', n: 'ⓝ', o: 'ⓞ', p: 'ⓟ', q: 'ⓠ', r: 'ⓡ', s: 'ⓢ', t: 'ⓣ', u: 'ⓤ', v: 'ⓥ', w: 'ⓦ', x: 'ⓧ', y: 'ⓨ', z: 'ⓩ', A: 'Ⓐ', B: 'Ⓑ', C: 'Ⓒ', D: 'Ⓓ', E: 'Ⓔ', F: 'Ⓕ', G: 'Ⓖ', H: 'Ⓗ', I: 'Ⓘ', J: 'Ⓙ', K: 'Ⓚ', L: 'Ⓛ', M: 'Ⓜ', N: 'Ⓝ', O: 'Ⓞ', P: 'Ⓟ', Q: 'Ⓠ', R: 'Ⓡ', S: 'Ⓢ', T: 'Ⓣ', U: 'Ⓤ', V: 'Ⓥ', W: 'Ⓦ', X: 'Ⓧ', Y: 'Ⓨ', Z: 'Ⓩ', '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨' } },
  { id: 'bubble-dark', name: 'Dark Bubble', map: { a: '🅐', b: '🅑', c: '🅒', d: '🅓', e: '🅔', f: '🅕', g: '🅖', h: '🅗', i: '🅘', j: '🅙', k: '🅚', l: '🅛', m: '🅜', n: '🅝', o: '🅞', p: '🅟', q: '🅠', r: '🅡', s: '🅢', t: '🅣', u: '🅤', v: '🅥', w: '🅦', x: '🅧', y: '🅨', z: '🅩', A: '🅐', B: '🅑', C: '🅒', D: '🅓', E: '🅔', F: '🅕', G: '🅖', H: '🅗', I: '🅘', J: '🅙', K: '🅚', L: '🅛', M: '🅜', N: '🅝', O: '🅞', P: '🅟', Q: '🅠', R: '🅡', S: '🅢', T: '🅣', U: '🅤', V: '🅥', W: '🅦', X: '🅧', Y: '🅨', Z: '🅩' } },
  { id: 'square', name: 'Square Box', map: { a: '🄰', b: '🄱', c: '🄲', d: '🄳', e: '🄴', f: '🄵', g: '🄶', h: '🄷', i: '🄸', j: '🄹', k: '🄺', l: '🄻', m: '🄼', n: '🄽', o: '🄾', p: '🄿', q: '🅀', r: '🅁', s: '🅂', t: '🅃', u: '🅄', v: '🅅', w: '🅆', x: '🅇', y: '🅈', z: '🅉', A: '🄰', B: '🄱', C: '🄲', D: '🄳', E: '🄴', F: '🄵', G: '🄶', H: '🄷', I: '🄸', J: '🄹', K: '🄺', L: '🄻', M: '🄼', N: '🄽', O: '🄾', P: '🄿', Q: '🅀', R: '🅁', S: '🅂', T: '🅃', U: '🅄', V: '🅅', W: '🅆', X: '🅇', Y: '🅈', Z: '🅉' } },
  { id: 'square-dark', name: 'Dark Square', map: { a: '🅰', b: '🅱', c: '🅲', d: '🅳', e: '🅴', f: '🅵', g: '🅶', h: '🅷', i: '🅸', j: '🅹', k: '🅺', l: '🅻', m: '🅼', n: '🅽', o: '🅾', p: '🅿', q: '🆀', r: '🆁', s: '🆂', t: '🆃', u: '🆄', v: '🆅', w: '🆆', x: '🆇', y: '🆈', z: '🆉', A: '🅰', B: '🅱', C: '🅲', D: '🅳', E: '🅴', F: '🅵', G: '🅶', H: '🅷', I: '🅸', J: '🅹', K: '🅺', L: '🅻', M: '🅼', N: '🅽', O: '🅾', P: '🅿', Q: '🆀', R: '🆁', S: '🆂', T: '🆃', U: '🆄', V: '🆅', W: '🆆', X: '🆇', Y: '🆈', Z: '🆉' } },
  { id: 'smallcaps', name: 'Mini Caps', map: { a: 'ᴀ', b: 'ʙ', c: 'ᴄ', d: 'ᴅ', e: 'ᴇ', f: 'ғ', g: 'ɢ', h: 'ʜ', i: 'ɪ', j: 'ᴊ', k: 'ᴋ', l: 'ʟ', m: 'ᴍ', n: 'ɴ', o: 'ᴏ', p: 'ᴘ', q: 'ǫ', r: 'ʀ', s: 's', t: 'ᴛ', u: 'ᴜ', v: 'ᴠ', w: 'ᴡ', x: 'x', y: 'ʏ', z: 'ᴢ' } },
  { id: 'fraktur', name: 'Gothic Medieval', map: { a: '𝔞', b: '𝔟', c: '𝔠', d: '𝔡', e: '𝔢', f: '𝔣', g: '𝔤', h: '𝔥', i: '𝔦', j: '𝔧', k: '𝔨', l: '𝔩', m: '𝔪', n: '𝔫', o: '𝔬', p: '𝔭', q: '𝔮', r: '𝔯', s: '𝔰', t: '𝔱', u: '𝔲', v: '𝔳', w: '𝔴', x: '𝔵', y: '𝔶', z: '𝔷', A: '𝔄', B: '𝔅', C: 'ℭ', D: '𝔇', E: '𝔈', F: '𝔉', G: '𝔊', H: 'ℌ', I: 'ℑ', J: '𝔍', K: '𝔎', L: '𝔏', M: '𝔐', N: '𝔑', O: '𝔒', P: '𝔓', Q: '𝔔', R: 'ℜ', S: '𝔖', T: '𝔗', U: '𝔘', V: '𝔙', W: '𝔚', X: '𝔛', Y: '𝔜', Z: 'ℨ' } },
  { id: 'bold-fraktur', name: 'Bold Gothic', map: { a: '𝖆', b: '𝖇', c: '𝖈', d: '𝖉', e: '𝖊', f: '𝖋', g: '𝖌', h: '𝖍', i: '𝖎', j: '𝖏', k: '𝖐', l: '𝖑', m: '𝖒', n: '𝖓', o: '𝖔', p: '𝖕', q: '𝖖', r: '𝖗', s: '𝖘', t: '𝖙', u: '𝖚', v: '𝖛', w: '𝖜', x: '𝖝', y: '𝖞', z: '𝖟', A: '𝕬', B: '𝕭', C: '𝕮', D: '𝕯', E: '𝕰', F: '𝕱', G: '𝕲', H: '𝕳', I: '𝕴', J: '𝕵', K: '𝕶', L: '𝕷', M: '𝕸', N: '𝕹', O: '𝕺', P: '𝕻', Q: '𝕼', R: '𝕽', S: '𝕾', T: '𝕿', U: '𝕾', V: '𝖁', W: '𝖂', X: '𝖃', Y: '𝖄', Z: '𝖅' } },
  { id: 'doublestruck', name: 'Hollow Outline', map: { a: '𝕒', b: '𝕓', c: '𝕔', d: '𝕕', e: '𝕖', f: '𝕗', g: '𝕘', h: '𝕙', i: '𝕚', j: '𝕛', k: '𝕜', l: '𝕝', m: '𝕞', n: '𝕟', o: '𝕠', p: '𝕡', q: '𝕢', r: '𝕣', s: '𝕤', t: '𝕥', u: '𝕦', v: '𝕧', w: '𝕨', x: '𝕩', y: '𝕪', z: '𝕫', A: '𝔸', B: '𝔹', C: 'ℂ', D: '𝔻', E: '𝔼', F: '𝔽', G: '𝔾', H: 'ℍ', I: '𝕀', J: '𝕁', K: '𝕂', L: '𝕃', M: '𝕄', N: 'ℕ', O: '𝕆', P: 'ℙ', Q: 'ℚ', R: 'ℝ', S: '𝕊', T: '𝕋', U: '𝕌', V: '𝕍', W: '𝕎', X: '𝕏', Y: '𝕐', Z: 'ℤ' } },
  { id: 'mono', name: 'Classic Typewriter', map: { a: '𝚊', b: '𝚋', c: '𝚌', d: '𝚍', e: '𝚎', f: '𝚏', g: '𝚐', h: '𝚑', i: '𝚒', j: '𝚓', k: '𝚔', l: '𝚕', m: '𝚖', n: '𝚗', o: '𝚘', p: '𝚙', q: '𝚚', r: '𝚛', s: '𝚜', t: '𝚝', u: '𝚞', v: '𝚟', w: '𝚠', x: '𝚡', y: '𝚢', z: '𝚣', A: '𝙰', B: '𝙱', C: '𝙲', D: '𝙳', E: '𝙴', F: '𝙵', G: '𝙶', H: '𝙷', I: '𝙸', J: '𝙹', K: '𝙺', L: '𝙻', M: '𝙼', N: '𝙽', O: '𝙾', P: '𝙿', Q: '𝚀', R: '𝚁', S: '𝚂', T: '𝚃', U: '𝚄', V: '𝚅', W: '𝚆', X: '𝚇', Y: '𝚈', Z: '𝚉' } },
  { id: 'wide', name: 'Wide Aesthetic', map: { a: 'ａ', b: 'ｂ', c: 'ｃ', d: 'ｄ', e: 'ｅ', f: 'ｆ', g: 'ｇ', h: 'ｈ', i: 'ｉ', j: 'ｊ', k: 'ｋ', l: 'ｌ', m: 'ｍ', n: 'ｎ', o: 'ｏ', p: 'ｐ', q: 'ｑ', r: 'ｒ', s: 'ｓ', t: 'ｔ', u: 'ｕ', v: 'ｖ', w: 'ｗ', x: 'ｘ', y: 'ｙ', z: 'ｚ', A: 'Ａ', B: 'Ｂ', C: 'Ｃ', D: 'Ｄ', E: 'Ｅ', F: 'Ｆ', G: 'Ｇ', H: 'Ｈ', I: 'Ｉ', J: 'Ｊ', K: 'Ｋ', L: 'Ｌ', M: 'Ｍ', N: 'Ｎ', O: 'Ｏ', P: 'Ｐ', Q: 'Ｑ', R: 'Ｒ', S: 'Ｓ', T: 'Ｔ', U: 'Ｕ', V: 'Ｖ', W: 'Ｗ', X: 'Ｘ', Y: 'Ｙ', Z: 'Ｚ', '0': '０', '1': '１', '2': '２', '3': '３', '4': '４', '5': '５', '6': '６', '7': '７', '8': '８', '9': '９' } },
  { id: 'upsidedown', name: 'Upside Down', map: { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ɓ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z', A: '∀', B: 'q', C: 'Ɔ', D: 'p', E: 'Ǝ', F: 'Ⅎ', G: 'פ', H: 'H', I: 'I', J: 'ɾ', K: 'ʞ', L: 'J', M: 'W', N: 'N', O: 'O', P: 'Ԁ', Q: 'Q', R: 'ɹ', S: 'S', T: 'ʇ', U: 'n', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z' } },
  { id: 'superscript', name: 'Superscript Tiny', map: { a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', q: 'q', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ', A: 'ᴬ', B: 'ᴮ', C: 'ᶜ', D: 'ᴰ', E: 'ᴱ', F: 'ᶠ', G: 'ᴳ', H: 'ᴴ', I: 'ᴵ', J: 'ᴶ', K: 'ᴷ', L: 'ᴸ', M: 'ᴹ', N: 'ᴺ', O: 'ᴼ', P: 'ᴾ', Q: 'Q', R: 'ᴿ', S: 'ˢ', T: 'ᵀ', U: 'ᵁ', V: 'ⱽ', W: 'ᵂ', X: 'ˣ', Y: 'ʸ', Z: 'ᶻ' } },
  { id: 'subscript', name: 'Subscript Low', map: { a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ' } },
  { id: 'slash', name: 'Slash Strike', prefix: '', suffix: '', join: '/' },
  { id: 'strikethrough', name: 'Strikethrough', prefix: '', suffix: '', join: '\u0336' },
  { id: 'underline', name: 'Underline Style', prefix: '', suffix: '', join: '\u0332' },
  { id: 'wavy', name: 'Wavy Style', prefix: '', suffix: '', join: '\u0330' },
  { id: 'slash-rev', name: 'Reverse Slash', prefix: '', suffix: '', join: '\\' },
  { id: 'boxed', name: 'Boxed Style', prefix: '[', suffix: ']', join: '][' },
  { id: 'curved', name: 'Curved Brackets', prefix: '(', suffix: ')', join: ')(' },
  { id: 'star-decor', name: 'Star Decoration', prefix: '★', suffix: '★', join: ' ' },
  { id: 'heart-decor', name: 'Heart Style', prefix: '♥', suffix: '♥', join: ' ' },
  { id: 'cloud-decor', name: 'Cloud Style', prefix: '☁', suffix: '☁', join: ' ' },
  { id: 'crown-decor', name: 'Crown Style', prefix: '👑', suffix: '👑', join: ' ' },
  { id: 'fire-decor', name: 'Fire Style', prefix: '🔥', suffix: '🔥', join: ' ' },
  { id: 'musical', name: 'Musical Notes', prefix: '🎵', suffix: '🎵', join: ' ' },
  { id: 'sparkles', name: 'Sparkly Style', prefix: '✨', suffix: '✨', join: ' ' },
  { id: 'brackets', name: 'Square Brackets', prefix: '【', suffix: '】', join: '】【' },
  { id: 'thick-brackets', name: 'Thick Brackets', prefix: '『', suffix: '』', join: '』『' },
  { id: 'fancy-brackets', name: 'Fancy Brackets', prefix: '《', suffix: '》', join: '》《' },
  { id: 'scary', name: 'Scary Glitch', map: { a: 'α', b: 'в', c: '¢', d: '∂', e: 'є', f: 'ƒ', g: 'g', h: 'н', i: 'ι', j: 'ʝ', k: 'к', l: 'ℓ', m: 'м', n: 'и', o: 'σ', p: 'ρ', q: 'q', r: 'я', s: 'ѕ', t: 'т', u: 'υ', v: 'ν', w: 'ω', x: 'χ', y: 'у', z: 'z' } },
  { id: 'ancient', name: 'Ancient Style', map: { a: 'ᚨ', b: 'ᛒ', c: 'ᚲ', d: 'ᛞ', e: 'ᛖ', f: 'ᚠ', g: 'ᚷ', h: 'ᚻ', i: 'ᛁ', j: 'ᛃ', k: 'ᚲ', l: 'ᛚ', m: 'ᛗ', n: 'ᚾ', o: 'ᛟ', p: 'ᛈ', q: 'ᚲ', r: 'ᚱ', s: 'ᛊ', t: 'ᛏ', u: 'ᚢ', v: 'ᚢ', w: 'ᚹ', x: 'ᛪ', y: 'ᚤ', z: 'ᛉ' } },
  { id: 'arrow', name: 'Arrow Up', map: { a: 'â', b: 'b', c: 'ĉ', d: 'd', e: 'ê', f: 'f', g: 'ĝ', h: 'ĥ', i: 'î', j: 'ĵ', k: 'k', l: 'l', m: 'm', n: 'n', o: 'ô', p: 'p', q: 'q', r: 'r', s: 'ŝ', t: 't', u: 'û', v: 'v', w: 'ŵ', x: 'x', y: 'ŷ', z: 'z' } },
  { id: 'flipped', name: 'Flipped Text', map: { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z' } },
  { id: 'crazy-glitch', name: 'Matrix Glitch', prefix: '∯', suffix: '∯', join: '҂' },
];

export default function FancyFontsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme ?? 'light'];
  const tintColor = '#8B5CF6'; // Violet Creator Theme
  const [inputText, setInputText] = useState('Hello World');
  const [isCopied, setIsCopied] = useState<string | null>(null);

  const generateFonts = (text: string) => {
    if (!text) return [];
    
    return FONT_STYLES.map(style => {
      let result = '';
      
      if (style.join !== undefined) {
        // Handle Join/Prefix/Suffix based styles
        const chars = text.split('');
        result = (style.prefix || '') + chars.join(style.join) + (style.suffix || '');
      } else if (style.map) {
        // Handle Map based styles
        for (const char of text) {
          result += (style.map as any)[char] || (style.map as any)[char.toLowerCase()] || char;
        }
      }
      
      return { ...style, text: result };
    });
  };

  const results = useMemo(() => generateFonts(inputText), [inputText]);

  const copyToClipboard = async (text: string, id: string) => {
    await Clipboard.setStringAsync(text);
    setIsCopied(id);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setTimeout(() => setIsCopied(null), 2000);
  };

  const renderItem = ({ item }: { item: typeof results[0] }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.styleName, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF', color: tintColor }]}>{item.name}</Text>
        <TouchableOpacity 
          style={styles.copyBtn} 
          onPress={() => copyToClipboard(item.text, item.id)}
        >
          <Copy size={16} color={isCopied === item.id ? tintColor : '#64748B'} />
          <Text style={[styles.copyText, isCopied === item.id && { color: tintColor }]}>
            {isCopied === item.id ? 'Copied' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.fontPreview, { color: theme.text }]}>{item.text}</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Fancy Font Generator</Text>
          <View style={[styles.headerIcon, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F5F3FF' }]}>
            <Sparkles size={20} color={tintColor} />
          </View>
        </View>

        {/* Input Section */}
        <View style={[styles.inputSection, { backgroundColor: theme.background }]}>
          <View style={[styles.inputContainer, { backgroundColor: isDark ? theme.card : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
            <TextInput
              style={[styles.textInput, { color: theme.text }]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type here"
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={150}
            />
            {inputText.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={() => setInputText('')}>
                <Trash2 size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Results List */}
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.listHeader}>Premium Styles ({results.length})</Text>
          }
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          initialNumToRender={10}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
      },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    borderRadius: 12,
  },
  inputSection: {
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  inputContainer: {
        borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    minHeight: 100,
    padding: 16,
  },
  textInput: {
    fontSize: 18,
    
    fontWeight: '600',
    textAlignVertical: 'top',
    paddingRight: 30,
  },
  clearBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  listHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  styleName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  fontPreview: {
    fontSize: 20,
    
    fontWeight: '500',
  },
});
