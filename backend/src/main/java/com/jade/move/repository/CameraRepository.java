package com.jade.move.repository;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.jade.move.model.Camera;
import com.jade.move.model.StreamType;

@Repository
public interface CameraRepository extends JpaRepository<Camera, Integer> {
    Optional<Camera> findByDeviceId(Integer deviceId);
    List<Camera> findByStreamType(StreamType streamType);
}
