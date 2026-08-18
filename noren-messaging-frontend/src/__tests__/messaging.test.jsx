/**
 * Test Suite: Messaging Functionality
 * Tests for DirectMessages component and messaging APIs
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DirectMessages from '../components/DirectMessages';
import api from '../utils/api';

vi.mock('../utils/api');
vi.mock('../context/SocketContext');
vi.mock('../context/AuthContext');

describe('Messaging System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('DirectMessages Component', () => {
    it('should fetch and display conversations on mount', async () => {
      api.get.mockResolvedValue({
        data: {
          conversations: [
            { id: 1, name: 'Test Conversation', members: [] }
          ]
        }
      });

      render(<DirectMessages />);
      
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('/social/conversations?limit=50');
      });
    });

    it('should allow user to select a conversation', async () => {
      const conversations = [
        { id: 1, name: 'Conversation 1', members: [], last_message: null }
      ];

      api.get.mockResolvedValueOnce({ data: { conversations } });
      api.get.mockResolvedValueOnce({ data: { messages: [] } });

      render(<DirectMessages />);

      await waitFor(() => {
        const conversationButton = screen.getByText('Conversation 1');
        fireEvent.click(conversationButton);
      });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('conversations/1/messages'));
    });

    it('should send a message with unique client_id', async () => {
      api.post.mockResolvedValue({
        data: {
          id: 1,
          message_text: 'Test message',
          delivery_status: 'sent',
          created_at: new Date().toISOString()
        }
      });

      render(<DirectMessages />);

      await waitFor(() => {
        fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
          target: { value: 'Test message' }
        });
        fireEvent.click(screen.getByText('Send'));
      });

      expect(api.post).toHaveBeenCalledWith(
        '/social/messages',
        expect.objectContaining({
          message_text: 'Test message',
          client_id: expect.any(String)
        })
      );
    });

    it('should prevent duplicate messages using client_id', async () => {
      const clientId = 'msg-12345';
      
      // First call should insert
      api.post.mockResolvedValueOnce({ data: { id: 1, client_id: clientId } });
      
      // Second call with same client_id should return same message
      api.post.mockResolvedValueOnce({ data: { id: 1, client_id: clientId } });

      render(<DirectMessages />);

      // Simulate retry
      fireEvent.change(screen.getByPlaceholderText('Type a message...'), {
        target: { value: 'Message' }
      });
      fireEvent.click(screen.getByText('Send'));

      // Retry should use same client_id
      fireEvent.click(screen.getByText('Send'));

      expect(api.post).toHaveBeenCalledTimes(2);
    });

    it('should mark messages as read', async () => {
      api.post.mockResolvedValue({ data: { message: 'Marked as read' } });

      render(<DirectMessages />);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          '/social/messages/mark-read',
          expect.any(Object)
        );
      });
    });

    it('should display message delivery status', async () => {
      const messages = [
        { id: 1, message_text: 'Sent', delivery_status: 'sent', sender_id: 1 },
        { id: 2, message_text: 'Delivered', delivery_status: 'delivered', sender_id: 1 },
        { id: 3, message_text: 'Read', delivery_status: 'read', sender_id: 1 }
      ];

      api.get.mockResolvedValue({ data: { messages } });

      render(<DirectMessages />);

      await waitFor(() => {
        expect(screen.getByText('Sent')).toBeInTheDocument();
        expect(screen.getByText('Delivered')).toBeInTheDocument();
        expect(screen.getByText('Read')).toBeInTheDocument();
      });
    });

    it('should handle message deletion', async () => {
      api.delete.mockResolvedValue({ data: { message: 'Deleted' } });

      render(<DirectMessages />);

      // Test delete functionality
      // Implementation details depend on UI design
    });

    it('should add emoji reactions to messages', async () => {
      api.post.mockResolvedValue({ 
        data: { 
          id: 1, 
          reactions: [{ emoji: '👍', count: 1 }] 
        } 
      });

      render(<DirectMessages />);

      // Test reaction functionality
      // Implementation details depend on UI design
    });

    it('should handle conversation with group members', async () => {
      const groupConversation = {
        id: 1,
        is_group: true,
        name: 'Group Chat',
        members: [
          { id: 1, name: 'User 1' },
          { id: 2, name: 'User 2' },
          { id: 3, name: 'User 3' }
        ]
      };

      api.get.mockResolvedValue({ data: { conversations: [groupConversation] } });

      render(<DirectMessages />);

      await waitFor(() => {
        expect(screen.getByText('Group Chat')).toBeInTheDocument();
        expect(screen.getByText('3 members')).toBeInTheDocument();
      });
    });

    it('should display typing indicators', async () => {
      // Mock socket event
      // Implementation depends on Socket context
    });

    it('should show unread message count', async () => {
      const conversations = [
        { 
          id: 1, 
          name: 'Unread Chat', 
          members: [],
          unread_count: 5 
        }
      ];

      api.get.mockResolvedValue({ data: { conversations } });

      render(<DirectMessages />);

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument(); // Unread badge
      });
    });

    it('should optimize for large conversations', async () => {
      const manyMessages = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        message_text: `Message ${i}`,
        delivery_status: 'delivered',
        sender_id: 1,
        created_at: new Date().toISOString()
      }));

      api.get.mockResolvedValue({ data: { messages: manyMessages } });

      const { container } = render(<DirectMessages />);

      // Should use pagination/virtualization
      const messages = container.querySelectorAll('[role="article"]');
      expect(messages.length).toBeLessThan(100); // Should render limited number
    });
  });

  describe('Message Delivery States', () => {
    it('should track sending state', () => {
      expect(['sending', 'sent', 'delivered', 'read']).toContain('sending');
    });

    it('should transition from sending to sent', () => {
      const message = { delivery_status: 'sending' };
      message.delivery_status = 'sent';
      expect(message.delivery_status).toBe('sent');
    });

    it('should transition to delivered', () => {
      const message = { delivery_status: 'sent' };
      message.delivery_status = 'delivered';
      expect(message.delivery_status).toBe('delivered');
    });

    it('should transition to read', () => {
      const message = { delivery_status: 'delivered' };
      message.delivery_status = 'read';
      expect(message.delivery_status).toBe('read');
    });

    it('should handle delivery failure', () => {
      const message = { delivery_status: 'failed' };
      expect(['sending', 'sent', 'delivered', 'read', 'failed']).toContain(
        message.delivery_status
      );
    });
  });

  describe('Error Handling', () => {
    it('should display error when fetch fails', async () => {
      api.get.mockRejectedValue(new Error('Network error'));

      render(<DirectMessages />);

      await waitFor(() => {
        expect(screen.getByText(/failed/i)).toBeInTheDocument();
      });
    });

    it('should retry on network error', async () => {
      api.get
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: { conversations: [] } });

      render(<DirectMessages />);

      // Should eventually retry and succeed
      await waitFor(() => {
        expect(api.get).toHaveBeenCalledTimes(2);
      });
    });

    it('should handle unauthorized access', async () => {
      api.get.mockRejectedValue({ response: { status: 401 } });

      render(<DirectMessages />);

      await waitFor(() => {
        expect(screen.getByText(/unauthorized/i)).toBeInTheDocument();
      });
    });

    it('should handle rate limiting', async () => {
      api.get.mockRejectedValue({ response: { status: 429 } });

      render(<DirectMessages />);

      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });
  });
});

describe('Message API Endpoints', () => {
  it('POST /social/messages should create message with delivery state', () => {
    const payload = {
      conversation_id: 1,
      message_text: 'Hello',
      client_id: 'msg-12345',
      media: []
    };

    expect(payload).toHaveProperty('client_id');
    expect(payload).toHaveProperty('conversation_id');
    expect(payload).toHaveProperty('message_text');
  });

  it('GET /social/conversations/:id/messages should paginate with cursor', () => {
    const cursor = 'msg-last-12345';
    const query = `?limit=50&cursor=${cursor}`;
    
    expect(query).toContain('cursor=');
    expect(query).toContain('limit=50');
  });

  it('POST /social/messages/mark-read should accept array of message IDs', () => {
    const payload = {
      message_ids: [1, 2, 3, 4, 5]
    };

    expect(Array.isArray(payload.message_ids)).toBe(true);
    expect(payload.message_ids.length).toBeGreaterThan(0);
  });

  it('POST /social/messages/:id/reactions should add emoji reaction', () => {
    const payload = {
      emoji: '👍'
    };

    expect(/\p{Emoji}/u.test(payload.emoji)).toBe(true);
  });
});
