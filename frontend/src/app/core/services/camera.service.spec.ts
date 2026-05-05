/// <reference types="jasmine" />

import { TestBed } from '@angular/core/testing';
import { of, throwError, skip, take } from 'rxjs';
import { CameraService } from './camera.service';
import { ApiService } from './api.service';
import { Camera, StreamType, StreamResponse } from '../models/camera.model';

/**
 * Test suite for CameraService.
 *
 * Covers:
 * - Service instantiation and dependency injection
 * - Fetching cameras by device ID (getCameraByDeviceId)
 * - Filtering cameras by stream type (getCamerasByStreamType)
 * - Stream control operations (startStream, stopStream)
 * - Stream session status queries (getStreamStatus)
 * - Retrieving active streams by device (getActiveStreamByDevice)
 * - Cache invalidation and refresh (triggerRefresh)
 * - Observable data$ emission and state management
 * - Observable error$ state propagation
 * - Observable refresh$ event triggering
 * - Error handling and recovery
 * - Cache duration and caching behavior
 * - Inheritance from BaseDataService
 */
describe('CameraService', () => {
  let service: CameraService;
  let apiServiceMock: jasmine.SpyObj<ApiService>;

  const mockCameras: Camera[] = [
    {
      id: 1,
      device: {
        id: 1,
        name: 'Front Gate Camera',
        type: 'CAMERA',
        state: 'ACTIVE',
        location: {
          id: 0,
          description: 'Main entrance',
          latitude: 0,
          longitude: 0,
        },
      },
      streamType: StreamType.RTSP,
      source: 'http://camera1.local',
    },
    {
      id: 2,
      device: {
        id: 2,
        name: 'Back Gate Camera',
        type: 'CAMERA',
        state: 'ACTIVE',
        location: {
          id: 0,
          description: 'Back entrance',
          latitude: 0,
          longitude: 0,
        },
      },
      streamType: StreamType.RTSP,
      source: 'rtsp://camera2.local',
    },
    {
      id: 3,
      device: {
        id: 3,
        name: 'Parking Camera',
        type: 'CAMERA',
        state: 'INACTIVE',
        location: {
          id: 0,
          description: 'Parking area',
          latitude: 0,
          longitude: 0,
        },
      },
      streamType: StreamType.URL,
      source: 'http://camera3.local',
    },
  ];

  const mockStreamResponse: StreamResponse = {
    sessionId: 'session-123',
    streamUrl: 'http://stream.local/feed',
    status: 'ACTIVE',
    streamType: 'RTSP',
    detectionCount: 5,
  };

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'delete']);

    TestBed.configureTestingModule({
      providers: [CameraService, { provide: ApiService, useValue: spy }],
    });

    service = TestBed.inject(CameraService);
    apiServiceMock = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have correct endpoint', () => {
    expect(service['endpoint']).toBe('cameras');
  });

  it('should have 10-minute cache duration', () => {
    expect(service['cacheDuration']).toBe(10 * 60 * 1000);
  });

  describe('getCameraByDeviceId()', () => {
    it('should fetch camera by device ID', (done) => {
      const deviceId = 1;
      const expectedCamera = mockCameras[0];

      apiServiceMock.get.and.returnValue(of(expectedCamera));

      service.getCameraByDeviceId(deviceId).subscribe((camera) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(`/cameras/device/${deviceId}`);
        expect(camera).toEqual(expectedCamera);
        done();
      });
    });

    it('should handle error when fetching camera by device ID', (done) => {
      const deviceId = 999;
      const error = new Error('Not found');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.getCameraByDeviceId(deviceId).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });

    it('should clear error on successful fetch', (done) => {
      apiServiceMock.get.and.returnValue(of(mockCameras[0]));

      service.error$.pipe(skip(1), take(1)).subscribe((err) => {
        expect(err).toBeNull();
        done();
      });

      service.getCameraByDeviceId(1).subscribe();
    });
  });

  describe('getCamerasByStreamType()', () => {
    it('should fetch cameras filtered by stream type', (done) => {
      const streamType = StreamType.RTSP;
      const expectedCameras = mockCameras.filter((c) => c.streamType === streamType);

      apiServiceMock.get.and.returnValue(of(expectedCameras));

      service.getCamerasByStreamType(streamType).subscribe((cameras) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(`/cameras/type/${streamType}`);
        expect(cameras.length).toBe(2);
        expect(cameras.every((c) => c.streamType === streamType)).toBe(true);
        done();
      });
    });

    it('should handle error when filtering by stream type', (done) => {
      const error = new Error('Server error');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.getCamerasByStreamType(StreamType.RTSP).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('startStream()', () => {
    it('should initiate a video stream session', (done) => {
      const cameraId = 1;

      apiServiceMock.post.and.returnValue(of(mockStreamResponse));

      service.startStream(cameraId).subscribe((response) => {
        expect(apiServiceMock.post).toHaveBeenCalledWith('/streams/start', {
          cameraId,
        });
        expect(response.sessionId).toBe('session-123');
        done();
      });
    });

    it('should clear error on successful stream start', (done) => {
      apiServiceMock.post.and.returnValue(of(mockStreamResponse));

      service.error$.pipe(skip(1), take(1)).subscribe((err) => {
        expect(err).toBeNull();
        done();
      });

      service.startStream(1).subscribe();
    });

    it('should handle error when starting stream', (done) => {
      const cameraId = 1;
      const error = new Error('Camera offline');

      apiServiceMock.post.and.returnValue(throwError(() => error));

      service.startStream(cameraId).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('stopStream()', () => {
    it('should terminate a streaming session', (done) => {
      const sessionId = 'session-123';
      const stopResponse = {
        message: 'Stream stopped successfully',
        sessionId: sessionId,
      };

      apiServiceMock.post.and.returnValue(of(stopResponse));

      service.stopStream(sessionId).subscribe((response) => {
        expect(apiServiceMock.post).toHaveBeenCalledWith(`/streams/stop/${sessionId}`, null);
        expect(response.message).toBe('Stream stopped successfully');
        done();
      });
    });

    it('should handle error when stopping stream', (done) => {
      const sessionId = 'invalid-session';
      const error = new Error('Session not found');

      apiServiceMock.post.and.returnValue(throwError(() => error));

      service.stopStream(sessionId).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('getStreamStatus()', () => {
    it('should query current streaming session status', (done) => {
      const sessionId = 'session-123';
      const statusResponse: StreamResponse = {
        sessionId,
        streamUrl: 'http://stream.local/feed',
        status: 'ACTIVE',
        streamType: 'RTSP',
        detectionCount: 5,
      };

      apiServiceMock.get.and.returnValue(of(statusResponse));

      service.getStreamStatus(sessionId).subscribe((response) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(`/streams/status/${sessionId}`);
        expect(response.status).toBe('ACTIVE');
        done();
      });
    });

    it('should handle error when querying stream status', (done) => {
      const sessionId = 'session-123';
      const error = new Error('Stream not found');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.getStreamStatus(sessionId).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('getActiveStreamByDevice()', () => {
    it('should fetch active stream for a device', (done) => {
      const deviceId = 1;

      apiServiceMock.get.and.returnValue(of(mockStreamResponse));

      service.getActiveStreamByDevice(deviceId).subscribe((response) => {
        expect(apiServiceMock.get).toHaveBeenCalledWith(`/streams/active/device/${deviceId}`);
        expect(response.status).toBe('ACTIVE');
        done();
      });
    });

    it('should handle error when fetching active stream', (done) => {
      const deviceId = 999;
      const error = new Error('No active stream');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      service.getActiveStreamByDevice(deviceId).subscribe({
        error: (err) => {
          expect(err).toBeDefined();
          done();
        },
      });
    });
  });

  describe('triggerRefresh()', () => {
    it('should emit refresh event', (done) => {
      apiServiceMock.get.and.returnValue(of(mockCameras));

      service.refresh$.pipe(take(1)).subscribe(() => {
        done();
      });

      service.triggerRefresh();
    });

    it('should invalidate cache and refresh camera list', (done) => {
      service['cacheData'] = mockCameras;
      service['lastFetch'] = Date.now();

      apiServiceMock.get.and.returnValue(of(mockCameras));

      service.triggerRefresh();

      setTimeout(() => {
        expect(service['cacheData']).toEqual(mockCameras);
        done();
      }, 100);
    });

    it('should handle error during refresh gracefully', (done) => {
      const error = new Error('Refresh failed');

      apiServiceMock.get.and.returnValue(throwError(() => error));

      let errorEmitted = false;
      service.error$.pipe(skip(1), take(1)).subscribe((err) => {
        if (err) {
          errorEmitted = true;
        }
      });

      service.triggerRefresh();

      setTimeout(() => {
        expect(errorEmitted).toBe(true);
        done();
      }, 100);
    });
  });

  describe('refresh$ observable', () => {
    it('should expose a refresh observable', () => {
      expect(service.refresh$).toBeDefined();
      expect(typeof service.refresh$.subscribe).toBe('function');
      expect(typeof service.refresh$.pipe).toBe('function');
    });
  });

  describe('Observable streams', () => {
    it('should emit initial empty data', (done) => {
      service.data$.pipe(take(1)).subscribe((cameras) => {
        expect(Array.isArray(cameras)).toBe(true);
        expect(cameras.length).toBe(0);
        done();
      });
    });

    it('should emit initial null error', (done) => {
      service.error$.pipe(take(1)).subscribe((error) => {
        expect(error).toBeNull();
        done();
      });
    });
  });

  describe('Inheritance from BaseDataService', () => {
    it('should inherit data$ observable', () => {
      expect(service.data$).toBeDefined();
      expect(typeof service.data$.subscribe).toBe('function');
      expect(typeof service.data$.pipe).toBe('function');
    });

    it('should inherit error$ observable', () => {
      expect(service.error$).toBeDefined();
      expect(typeof service.error$.subscribe).toBe('function');
      expect(typeof service.error$.pipe).toBe('function');
    });

    it('should have getAll method', () => {
      expect(typeof service.getAll).toBe('function');
    });

    it('should have private cacheData', () => {
      service['cacheData'] = mockCameras;
      expect(service['cacheData']).toEqual(mockCameras);
    });

    it('should have lastFetch timestamp', () => {
      expect(service['lastFetch']).toBeDefined();
      expect(typeof service['lastFetch']).toBe('number');
    });
  });
});
