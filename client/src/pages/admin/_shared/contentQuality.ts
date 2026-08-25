export function hasConfiguredVariantOptions(
  availableSizes?: readonly string[] | null,
  availableColors?: readonly unknown[] | null,
): boolean {
  return (availableSizes?.length ?? 0) > 0 || (availableColors?.length ?? 0) > 0;
}