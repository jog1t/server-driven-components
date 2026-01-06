/**
 * Global Channel Manager Instance
 *
 * Single source of truth for all channels in the application.
 */

import { createChannelManager } from './channels/create-channel-manager';
import { createMemoryBackend } from './channels/backends/memory';

// Create global channel manager with memory backend
export const channelManager = createChannelManager(createMemoryBackend());

// Export convenience methods
export const { defineChannel, onChannel, broadcast } = channelManager;
