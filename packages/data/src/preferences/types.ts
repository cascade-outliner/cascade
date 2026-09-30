/** Per-browser settings that aren't part of the outline: feature flag overrides, UI choices. */
export interface Preferences {
	get(key: string): Promise<unknown>;
	set(key: string, value: unknown): Promise<void>;
	remove(key: string): Promise<void>;
	/** Called with the key when another instance (e.g. another tab) changes it. */
	subscribe(listener: (key: string) => void): () => void;
}
