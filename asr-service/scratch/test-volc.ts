import WebSocket from 'ws';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const appId = '4393418326';
const token = 'AHgnRMPknEYAbSto4TCWLmCPisbsbBvW';
const cluster = 'volcengine_streaming_common';
const endpoint = process.env.VOLC_ASR_ADDRESS || 'wss://openspeech.bytedance.com/api/v2/asr';

console.log('Testing Volcengine ASR Connection...');
console.log(`Endpoint: ${endpoint}`);
console.log(`AppId: ${appId}`);
console.log(`Token: Bearer;${token.slice(0, 5)}...`);

const headers = {
    'Authorization': `Bearer;${token}`,
    'User-Agent': 'test-script',
};

const ws = new WebSocket(endpoint, { headers });

const timeout = setTimeout(() => {
    console.error('Connection timeout after 10s');
    ws.terminate();
    process.exit(1);
}, 10000);

ws.on('open', () => {
    console.log('WebSocket Connection Opened!');
    clearTimeout(timeout);
    
    const handshake = {
        app: { appid: appId, token: token, cluster: cluster },
        user: { uid: 'test-user' },
        audio: { format: 'raw', codec: 'raw', rate: 16000, bits: 16, channel: 1, language: 'zh-CN' },
        request: { reqid: 'test-req-id', workflow: 'audio_in,resample,partition,vad,fe,decode', sequence: 1, nbest: 1, show_utterances: true, vad_signal: false }
    };

    // Header for handshake
    const header = Buffer.alloc(4);
    header[0] = (0b0001 << 4) | 0b0001;
    header[1] = (0b0001 << 4) | 0b0000;
    header[2] = (0b0001 << 4) | 0b0000;
    header[3] = 0;

    const payload = Buffer.from(JSON.stringify(handshake));
    const payloadSize = Buffer.alloc(4);
    payloadSize.writeUInt32BE(payload.length, 0);

    const message = Buffer.concat([header, payloadSize, payload]);
    ws.send(message);
    console.log('Handshake sent');
});

ws.on('message', (data) => {
    console.log('Received message from server');
    const buffer = data as Buffer;
    if (buffer.length >= 8) {
        const messageType = (buffer[1] & 0b11110000) >> 4;
        console.log(`Message Type: 0x0${messageType.toString(16)}`);
        
        const payloadLength = buffer.readUInt32BE(4);
        const payload = buffer.slice(8, 8 + payloadLength).toString('utf8');
        console.log(`Payload: ${payload}`);
        
        if (messageType === 0x09) {
            console.log('SUCCESS! Handshake confirmed.');
            ws.close();
            process.exit(0);
        } else if (messageType === 0x0f) {
            console.log('ERROR received from server');
            process.exit(1);
        }
    } else {
        console.log(`Raw data: ${buffer.toString('utf8')}`);
    }
});

ws.on('error', (err) => {
    console.error(`WebSocket Error: ${err.message}`);
    process.exit(1);
});

ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} ${reason}`);
    process.exit(0);
});
