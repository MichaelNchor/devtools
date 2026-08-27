// Next handles CSS at build time; TypeScript only needs to know the import is
// legal. Declaring the shape as `void` keeps anyone from importing a binding
// out of a stylesheet by accident.
declare module "*.css";
