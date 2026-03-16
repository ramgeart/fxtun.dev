/**
 * Codec for encoding and decoding fxTunnel protocol messages
 * Uses length-prefixed JSON encoding (4-byte big-endian length + JSON payload)
 */

import { Message, MessageType, AnyMessage } from './protocol';

/**
 * Maximum message size (1MB)
 */
export const MAX_MESSAGE_SIZE = 1 << 20;

/**
 * Header size in bytes (4-byte length prefix)
 */
export const HEADER_SIZE = 4;

/**
 * Codec for encoding and decoding protocol messages
 */
export class Codec {
  /**
   * Encode a message to a Buffer with length prefix
   * @param message Message to encode
   * @returns Buffer containing length-prefixed JSON
   */
  static encode(message: AnyMessage): Buffer {
    const json = JSON.stringify(message);
    const dataBuffer = Buffer.from(json, 'utf-8');

    if (dataBuffer.length > MAX_MESSAGE_SIZE) {
      throw new Error(
        `Message too large: ${dataBuffer.length} > ${MAX_MESSAGE_SIZE}`
      );
    }

    // Create buffer with length prefix
    const buffer = Buffer.allocUnsafe(HEADER_SIZE + dataBuffer.length);

    // Write length as 4-byte big-endian unsigned integer
    buffer.writeUInt32BE(dataBuffer.length, 0);

    // Copy data
    dataBuffer.copy(buffer, HEADER_SIZE);

    return buffer;
  }

  /**
   * Decode a message from a Buffer
   * @param buffer Buffer containing the JSON payload (without length prefix)
   * @returns Decoded message object
   */
  static decode(buffer: Buffer): AnyMessage {
    const json = buffer.toString('utf-8');
    const message = JSON.parse(json) as AnyMessage;
    return message;
  }

  /**
   * Create a new message with base fields
   * @param type Message type
   * @param additionalFields Additional fields to include
   * @returns Message object
   */
  static createMessage<T extends Message>(
    type: MessageType,
    additionalFields?: Partial<T>
  ): T {
    return {
      type,
      timestamp: Date.now(),
      ...additionalFields,
    } as T;
  }
}

/**
 * Message reader for reading length-prefixed messages from a stream
 */
export class MessageReader {
  private buffer: Buffer = Buffer.alloc(0);

  /**
   * Feed data into the reader
   * @param data Data chunk to process
   * @returns Array of complete messages found in the data
   */
  feed(data: Buffer): AnyMessage[] {
    this.buffer = Buffer.concat([this.buffer, data]);
    const messages: AnyMessage[] = [];

    while (this.buffer.length >= HEADER_SIZE) {
      // Read length prefix
      const length = this.buffer.readUInt32BE(0);

      if (length > MAX_MESSAGE_SIZE) {
        throw new Error(`Message too large: ${length} > ${MAX_MESSAGE_SIZE}`);
      }

      // Check if we have the complete message
      if (this.buffer.length < HEADER_SIZE + length) {
        break; // Need more data
      }

      // Extract message payload
      const payload = this.buffer.subarray(HEADER_SIZE, HEADER_SIZE + length);

      // Decode message
      const message = Codec.decode(payload);
      messages.push(message);

      // Remove processed message from buffer
      this.buffer = this.buffer.subarray(HEADER_SIZE + length);
    }

    return messages;
  }

  /**
   * Reset the internal buffer
   */
  reset(): void {
    this.buffer = Buffer.alloc(0);
  }
}
