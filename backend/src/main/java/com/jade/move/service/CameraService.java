package com.jade.move.service;

import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import com.jade.move.model.Camera;
import com.jade.move.model.StreamType;
import com.jade.move.repository.CameraRepository;

@Service
public class CameraService {

    private final CameraRepository cameraRepository;

    public CameraService(CameraRepository cameraRepository) {
        this.cameraRepository = cameraRepository;
    }

    public List<Camera> getAllCameras() {
        return cameraRepository.findAll();
    }

    public Optional<Camera> getCameraById(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Camera id cannot be null");
        }
        return cameraRepository.findById(id);
    }

    public Optional<Camera> getCameraByDeviceId(Integer deviceId) {
        if (deviceId == null) {
            throw new IllegalArgumentException("Device id cannot be null");
        }
        return cameraRepository.findByDeviceId(deviceId);
    }

    public List<Camera> getCamerasByStreamType(StreamType streamType) {
        return cameraRepository.findByStreamType(streamType);
    }

    public Camera createCamera(Camera camera) {
        if (camera == null) {
            throw new IllegalArgumentException("Camera cannot be null");
        }
        return cameraRepository.save(camera);
    }

    public Camera updateCamera(Camera camera) {
        if (camera == null) {
            throw new IllegalArgumentException("Camera cannot be null");
        }
        return cameraRepository.save(camera);
    }

    public void deleteCamera(Integer id) {
        if (id == null) {
            throw new IllegalArgumentException("Camera id cannot be null");
        }
        cameraRepository.deleteById(id);
    }
}
