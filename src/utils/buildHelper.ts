
/**
 * Helper utilities for building and loading the extension
 * This is only used in development and doesn't get included in the extension
 */

// Check if running in extension environment
export const isExtensionEnvironment = (): boolean => {
  return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
};

// Log extension environment status
export const logEnvironmentInfo = (): void => {
  console.log(`
  ========================================
  Daily Cheer Tracker Extension
  ----------------------------------------
  Running as extension: ${isExtensionEnvironment() ? 'Yes' : 'No'}
  Mode: ${import.meta.env.MODE}
  Build time: ${new Date().toISOString()}
  ========================================
  `);

  if (!isExtensionEnvironment()) {
    console.info(`
    To load as extension:
    1. Run: npm run build
    2. Navigate to chrome://extensions/
    3. Enable "Developer mode"
    4. Click "Load unpacked"
    5. Select the "dist" folder
    `);
  }
};

// Create link to open extension page
export const createExtensionLink = (): HTMLElement | null => {
  if (!isExtensionEnvironment() && typeof document !== 'undefined') {
    const link = document.createElement('div');
    link.style.position = 'fixed';
    link.style.bottom = '10px';
    link.style.right = '10px';
    link.style.background = '#4CAF50';
    link.style.color = 'white';
    link.style.padding = '8px 12px';
    link.style.borderRadius = '4px';
    link.style.cursor = 'pointer';
    link.style.zIndex = '9999';
    link.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
    link.innerHTML = 'Load as Extension';
    
    link.addEventListener('click', () => {
      window.open('chrome://extensions/', '_blank');
    });
    
    document.body.appendChild(link);
    return link;
  }
  return null;
};

// Export for use in main
export default { isExtensionEnvironment, logEnvironmentInfo, createExtensionLink };
