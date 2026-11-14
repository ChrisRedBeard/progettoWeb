export type SignedUpload = {
  storageKey: string;
  uploadUrl: string;
  expiresAt: string;
};

export type SignedRead = {
  url: string;
  expiresAt: string;
};

// Il resto dell'app parla solo con questa interfaccia.
// Un provider S3 restituisce URL del bucket e non usa le route locali.
export interface StorageProvider {
  createUpload(input: { contentType: string; maxBytes: number }): Promise<SignedUpload>;
  createReadUrl(storageKey: string, contentType: string): Promise<SignedRead>;
  remove(storageKey: string): Promise<void>;
}
