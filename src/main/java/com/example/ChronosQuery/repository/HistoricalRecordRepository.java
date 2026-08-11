package com.example.ChronosQuery.repository;

import com.example.ChronosQuery.model.HistoricalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface HistoricalRecordRepository extends JpaRepository<HistoricalRecord, Long> {

    @Query("SELECT h FROM HistoricalRecord h WHERE h.recordKey = :key " +
            "AND h.systemStartTime <= :endTime " +
            "AND (h.systemEndTime >= :startTime OR h.systemEndTime IS NULL)")
    List<HistoricalRecord> findRecordsInTimeRange(@Param("key") String key,
                                                  @Param("startTime") LocalDateTime startTime,
                                                  @Param("endTime") LocalDateTime endTime);

    @Query("SELECT h FROM HistoricalRecord h WHERE h.recordKey = :key AND h.systemEndTime IS NULL")
    Optional<HistoricalRecord> findActiveRecordByKey(@Param("key") String key);
}