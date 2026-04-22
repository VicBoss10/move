package com.jade.move.model;

/**
 * Stream type enumeration.
 *
 * <p>Represents the source type for video streaming:</p>
 * <ul>
 *   <li>USB: USB camera input</li>
 *   <li>URL: HTTP/HTTPS URL source</li>
 *   <li>RTSP: RTSP protocol stream</li>
 *   <li>YOUTUBE: YouTube stream URL</li>
 * </ul>
 *
 * @since 0.0.1
 */
public enum StreamType {
    USB,
    URL,
    RTSP,
    YOUTUBE
}
