"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sqlite3_1 = __importDefault(require("sqlite3"));
sqlite3_1.default.Database.prototype.createFunction = function (name, callback) {
    this.run(`SELECT 1`, [], (err) => {
        if (err) {
            console.error(`Error during database operation:`, err);
        }
        this[name] = callback;
    });
};
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const db = new sqlite3_1.default.Database('uuid.db');
        if (!db) {
            throw new Error("Failed to open database.");
        }
        const hexToInt = (ch) => {
            const charCode = ch.charCodeAt(0);
            if (ch >= '0' && ch <= '9') {
                return charCode - 48;
            }
            else if (ch >= 'a' && ch <= 'f') {
                return charCode - 87;
            }
            else if (ch >= 'A' && ch <= 'F') {
                return charCode - 55;
            }
            else {
                return null;
            }
        };
        const uuidBlobToStr = (aBlob) => {
            let zStr = '';
            let k = 0x550;
            for (let i = 0; i < 16; i++, k >>= 1) {
                if (k & 1) {
                    zStr += '-';
                }
                const x = aBlob[i];
                zStr += ('0' + (x >> 4).toString(16)).slice(-1) + ('0' + (x & 0xf).toString(16)).slice(-1);
            }
            return zStr;
        };
        const uuidStrToBlob = (zStr) => {
            if (zStr[0] === '{') {
                zStr = zStr.slice(1, -1);
            }
            let aBlob = Buffer.alloc(16);
            let i = 0;
            for (let j = 0; j < zStr.length; j++) {
                if (zStr[j] === '-')
                    continue;
                const hi = hexToInt(zStr[j]);
                const lo = hexToInt(zStr[++j]);
                if (hi === null || lo === null)
                    return null;
                aBlob[i++] = (hi << 4) | lo;
            }
            if (i !== 16 || zStr.length > 36)
                return null;
            return aBlob;
        };
        const uuid = () => {
            const aBlob = Buffer.alloc(16);
            for (let i = 0; i < 16; i++) {
                aBlob[i] = Math.floor(Math.random() * 256);
            }
            aBlob[6] = (aBlob[6] & 0x0f) | 0x40;
            aBlob[8] = (aBlob[8] & 0x3f) | 0x80;
            return uuidBlobToStr(aBlob);
        };
        db.serialize(() => {
            try {
                db.createFunction('hexToInt', (h) => {
                    return hexToInt(h);
                });
                db.createFunction('uuidBlobToStr', (aBlob) => {
                    return uuidBlobToStr(aBlob);
                });
                db.createFunction('uuidStrToBlob', (zStr) => {
                    return uuidStrToBlob(zStr);
                });
                db.createFunction('uuid', () => {
                    return uuid();
                });
                db.createFunction('uuid_str', (input) => {
                    if (typeof input === 'string') {
                        const blob = uuidStrToBlob(input);
                        return blob ? uuidBlobToStr(blob) : null;
                    }
                    else if (input instanceof Buffer && input.length === 16) {
                        return uuidBlobToStr(input);
                    }
                    else {
                        return null;
                    }
                });
                db.createFunction('uuid_blob', (input) => {
                    if (typeof input === 'string') {
                        return uuidStrToBlob(input);
                    }
                    else if (input instanceof Buffer && input.length === 16) {
                        return input;
                    }
                    else {
                        return null;
                    }
                });
                // Move the queries within the try block after the functions are defined
                db.all('SELECT uuid()', (err, result1) => {
                    if (err) {
                        console.error('Error in SELECT uuid():', err);
                        return;
                    }
                    console.log('Generated UUID:', result1);
                    db.all("SELECT uuid_blob('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')", (err, result2) => {
                        if (err) {
                            console.error('Error in SELECT uuid_blob():', err);
                            return;
                        }
                        console.log('UUID as blob:', result2);
                        db.all("SELECT uuid_str(X'a0eebc999c0b4ef8bb6d6bb9bd380a11')", (err, result3) => {
                            if (err) {
                                console.error('Error in SELECT uuid_str():', err);
                                return;
                            }
                            console.log('UUID as string:', result3);
                            db.close();
                        });
                    });
                });
            }
            catch (err) {
                console.error('General error:', err.message);
                db.close();
            }
        });
    });
}
main();
