import 'dotenv/config';
import { createHash } from 'crypto';

const apiKey = 'fvm_079ecf0e41d8f029b66becc585dd4e3cb8e807f07598ac0b';
const hash = createHash('sha256').update(apiKey).digest('hex');
console.log('Computed hash:', hash);
console.log('Expected hash:', 'a2e6692b6a6bd3e6bfffed377cb84c1360b93a619dda8a29ee10768aa9af3082');
console.log('Match:', hash === 'a2e6692b6a6bd3e6bfffed377cb84c1360b93a619dda8a29ee10768aa9af3082');
