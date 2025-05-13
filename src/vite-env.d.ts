
/// <reference types="vite/client" />
/// <reference types="chrome" />

// Declare chrome namespace for development environment
interface Window {
  chrome?: typeof chrome;
}
