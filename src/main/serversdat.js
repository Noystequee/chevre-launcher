// Hand-rolled minimal NBT writer for the one shape servers.dat needs:
// TAG_Compound(root) { TAG_List "servers" [ TAG_Compound { hidden, ip, name } ] }
function writeString(chunks, str) {
  const buf = Buffer.from(str, 'utf-8');
  const len = Buffer.alloc(2);
  len.writeUInt16BE(buf.length, 0);
  chunks.push(len, buf);
}

function buildServersDat(ip, name) {
  const chunks = [];
  chunks.push(Buffer.from([0x0a, 0x00, 0x00])); // TAG_Compound root, unnamed

  chunks.push(Buffer.from([0x09])); // TAG_List
  writeString(chunks, 'servers');
  chunks.push(Buffer.from([0x0a])); // element type: TAG_Compound
  const count = Buffer.alloc(4);
  count.writeInt32BE(1, 0);
  chunks.push(count);

  chunks.push(Buffer.from([0x01])); // TAG_Byte
  writeString(chunks, 'hidden');
  chunks.push(Buffer.from([0x00]));

  chunks.push(Buffer.from([0x08])); // TAG_String
  writeString(chunks, 'ip');
  writeString(chunks, ip);

  chunks.push(Buffer.from([0x08])); // TAG_String
  writeString(chunks, 'name');
  writeString(chunks, name);

  chunks.push(Buffer.from([0x00])); // TAG_End: close list entry compound
  chunks.push(Buffer.from([0x00])); // TAG_End: close root compound

  return Buffer.concat(chunks);
}

module.exports = { buildServersDat };
