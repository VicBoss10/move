package com.jade.move.repository;

import com.jade.move.model.StreamSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StreamSessionRepository extends JpaRepository<StreamSession, Integer> {
    Optional<StreamSession> findBySessionId(String sessionId);
    Optional<StreamSession> findFirstByDeviceIdAndStatusOrderByCreatedAtDesc(Integer deviceId, String status);
    List<StreamSession> findByDeviceIdAndStatus(Integer deviceId, String status);
}