/**
 * Update target object with source fields,
 * tailored for valtio
 */
export function deepMerge<T>(target: T, source: any): void {
    for (const key in source) {
        const value = source[key];
        if (
            Array.isArray(value) ||
            typeof value !== 'object' ||
            !(target as any)[key]
        ) {
            (target as any)[key] = value;
            continue;
        }

        // value is object
        deepMerge((target as any)[key], value);
    }
}
