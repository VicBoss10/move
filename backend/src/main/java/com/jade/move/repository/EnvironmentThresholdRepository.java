package com.jade.move.repository;

import com.jade.move.model.EnvironmentThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repositorio para la gestión de persistencia de umbrales ambientales.
 *
 * <p>Proporciona métodos especializados para acceder, crear, actualizar y eliminar
 * registros de umbrales de métricas ambientales en la base de datos.</p>
 *
 * @since 0.0.1
 */
@Repository
public interface EnvironmentThresholdRepository extends JpaRepository<EnvironmentThreshold, Integer> {

    /**
     * Obtiene todos los umbrales para una métrica específica, ordenados por nivel.
     *
     * @param metric nombre de la métrica (co2, pm25, temperatura, etc.)
     * @return lista de umbrales ordenada por nivel
     */
    List<EnvironmentThreshold> findByMetricOrderByLevel(String metric);

    /**
     * Obtiene un umbral específico por métrica y nivel.
     *
     * @param metric nombre de la métrica
     * @param level nivel del umbral (good, moderate, poor, critical)
     * @return Optional con el umbral encontrado, vacío si no existe
     */
    Optional<EnvironmentThreshold> findByMetricAndLevel(String metric, String level);

    /**
     * Obtiene todos los umbrales registrados en la base de datos.
     *
     * @return lista completa de umbrales
     */
    @Override
    List<EnvironmentThreshold> findAll();

    /**
     * Elimina todos los umbrales asociados a una métrica específica.
     *
     * @param metric nombre de la métrica cuyos umbrales serán eliminados
     */
    void deleteByMetric(String metric);
}
