import storage from "@/lib/storage";
import { Secp256k1Keypair } from "@atproto/crypto";
import * as cbor from '@ipld/dag-cbor';
import { uint8ArrayToHex } from "@/lib/dag-cbor";

export interface SignatureResult {
    signed_bytes: string;
    signing_key_did: string;
}

/**
 * Generate signature for the given parameters using the stored user sign key.
 * @param params The parameters to be signed (will be CBOR encoded).
 * @returns Object containing signed_bytes (hex) and signing_key_did.
 * @throws Error if user is not logged in (signKey not found).
 */
export async function generateSignature(params: unknown): Promise<SignatureResult> {
    // 1. Get signKey from storage
    const storageInfo = storage.getToken();
    if (!storageInfo?.signKey) {
        throw new Error("User not logged in or missing sign key");
    }

    // 2. Encode params with CBOR
    const unsignedCommit = cbor.encode(params);

    // 3. Import KeyPair
    // storageInfo.signKey is expected to be in a format that needs slicing (e.g. "0x...")
    const keyPair = await Secp256k1Keypair.import(storageInfo.signKey.slice(2));

    // 4. Sign
    const signature = await keyPair.sign(unsignedCommit);

    // 5. Convert to hex
    const signedBytes = uint8ArrayToHex(signature);

    // 6. Get signing_key_did
    const signingKeyDid = keyPair.did();

    return {
        signed_bytes: signedBytes,
        signing_key_did: signingKeyDid,
    };
}
