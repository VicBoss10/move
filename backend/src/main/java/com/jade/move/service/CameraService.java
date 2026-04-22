package com.jade.move.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.jade.move.exception.EntityNotFoundException;
import com.jade.move.model.Camera;
import com.jade.move.model.StreamType;
import com.jade.move.repository.CameraRepository;

/**
 * Service for camera-related operations.
 *
 * <p>Provides business logic for managing camera entities including retrieval,
 * creation, updates and deletion. Cameras are associated with devices and support
 * different streaming types.</p>
 *
 * @since 0.0.1
 */
@Service
public class CameraService {

    private final CameraRepository cameraRepository;

    public CameraService(CameraRepository cameraRepository) {
        this.cameraRepository = cameraRepository;
    }

    /**
     * Retrieves all cameras.
     *
     * @return list of all cameras
     */
    public List<Camera> getAllCameras() {
        return cameraRepository.findAll();
    }

    /**
     * Retrieves a camera by identifier.
     *
     * @param id camera identifier
     * @return camera data
     * @throws IllegalArgumentException if id is null
     * @throws EntityNotFoundException if camera not found
     */
    public Camera getCameraById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Camera id cannot be null");
        }
        return cameraRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Camera not found with id: " + id));
    }

    /**
     * Retrieves the camera associated with a device.
     *
     * @param deviceId device identifier
     * @return camera for the device
     * @throws IllegalArgumentException if deviceId is null
     * @throws EntityNotFoundException if no camera found
     */
    public Camera getCameraByDeviceId(Integer deviceId) {
        if (deviceId == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        return cameraRepository.findByDeviceId(deviceId)
                .orElseThrow(() -> new EntityNotFoundException("Camera not found for device id: " + deviceId));
    }

    /**
     * Retrieves all cameras with a specific streaming type.
     *
     * @param streamType stream type to filter
     * @return list of matching cameras
     */
    public List<Camera> getCamerasByStreamType(StreamType streamType) {
        return cameraRepository.findByStreamType(streamType);
    }

    /**
     * Creates a new camera.
     *
     * @param camera camera to persist
     * @return created camera
     * @throws IllegalArgumentException if camera is null
     */
    public Camera createCamera(Camera camera) {
        if (camera == null) {
            throw new IllegalArgumentException("Camera cannot be null");
        }
        return cameraRepository.save(camera);
    }

    /**
     * Updates an existing camera.
     *
     * @param camera camera with updated data
     * @return updated camera
     * @throws IllegalArgumentException if camera is null
     */
    public Camera updateCamera(Camera camera) {
        if (camera == null) {
            throw new IllegalArgumentException("Camera cannot be null");
        }
        return cameraRepository.save(camera);
    }

    /**
     * Deletes a camera by identifier.
     *
     * @param id camera identifier to delete
     * @throws IllegalArgumentException if id is null
     */
    public void deleteCamera(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Camera id cannot be null");
        }
        cameraRepository.deleteById(id);
    }
}
