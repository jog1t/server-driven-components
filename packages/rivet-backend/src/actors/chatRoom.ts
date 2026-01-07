import { actor } from 'rivetkit';

export interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

/**
 * Chat room actor with message history
 *
 * Demonstrates:
 * - Persistent message history in actor state
 * - Real-time message broadcasting
 * - Event-driven architecture
 */
export const chatRoom = actor({
  state: {
    messages: [] as Message[],
    participants: new Set<string>()
  },

  onStateChange: (c, newState) => {
    // Broadcast the latest message to all connected clients
    if (newState.messages.length > 0) {
      const latestMessage = newState.messages[newState.messages.length - 1];
      c.broadcast('newMessage', latestMessage);
    }
  },

  actions: {
    /**
     * Send a message to the chat room
     */
    sendMessage: (c, data: { username: string; text: string }) => {
      const message: Message = {
        id: crypto.randomUUID(),
        username: data.username,
        text: data.text,
        timestamp: Date.now()
      };

      c.state.messages.push(message);

      // Keep only last 100 messages
      if (c.state.messages.length > 100) {
        c.state.messages = c.state.messages.slice(-100);
      }

      return { message };
    },

    /**
     * Get message history
     */
    getMessages: (c, params?: { limit?: number }) => {
      const limit = params?.limit ?? 50;
      const messages = c.state.messages.slice(-limit);
      return { messages };
    },

    /**
     * Join the chat room
     */
    join: (c, data: { username: string }) => {
      c.state.participants.add(data.username);

      // Broadcast join event
      c.broadcast('userJoined', {
        username: data.username,
        participantCount: c.state.participants.size
      });

      return {
        success: true,
        participantCount: c.state.participants.size
      };
    },

    /**
     * Leave the chat room
     */
    leave: (c, data: { username: string }) => {
      c.state.participants.delete(data.username);

      // Broadcast leave event
      c.broadcast('userLeft', {
        username: data.username,
        participantCount: c.state.participants.size
      });

      return {
        success: true,
        participantCount: c.state.participants.size
      };
    },

    /**
     * Get current participants
     */
    getParticipants: (c) => {
      return {
        participants: Array.from(c.state.participants),
        count: c.state.participants.size
      };
    }
  }
});
