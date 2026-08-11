package com.example.ChronosQuery.service;

import com.example.ChronosQuery.model.HistoricalRecord;
import com.example.ChronosQuery.repository.HistoricalRecordRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class HistoricalRecordService {
    @Autowired
    private HistoricalRecordRepository repository;

    @Autowired
    private KafkaEventProducer kafkaProducer;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    private static final String REDIS_ACTIVE_PREFIX = "active:record:";

    @Transactional
    public HistoricalRecord saveOrUpdateRecord(String recordKey, String newPayLoad){
        LocalDateTime now = LocalDateTime.now();

        Optional<HistoricalRecord> activeRecordOpt = repository.findActiveRecordByKey(recordKey);

        if(activeRecordOpt.isPresent()){
            HistoricalRecord activeRecord = activeRecordOpt.get();

            if(activeRecord.getPayload().equals(newPayLoad)){
                return activeRecord;
            }

            activeRecord.setSystemEndTime(now);
            repository.save(activeRecord);
        }

        HistoricalRecord newRecord = HistoricalRecord.builder()
                .recordKey(recordKey)
                .payload(newPayLoad)
                .systemStartTime(now)
                .systemEndTime(null)
                .build();

        HistoricalRecord savedRecord = repository.save(newRecord);

        kafkaProducer.sendUpdateEvent(recordKey, newPayLoad);

        redisTemplate.opsForValue().set(
                REDIS_ACTIVE_PREFIX + recordKey,
                newPayLoad,
                Duration.ofHours(1)
        );

        return savedRecord;
    }

    // Fixed return type to List<HistoricalRecord> to match repository and controller
    public List<HistoricalRecord> getRecordsInTimeRange(String recordKey, LocalDateTime startTime, LocalDateTime endTime) {
        return repository.findRecordsInTimeRange(recordKey, startTime, endTime);
    }

    public String getActivePayloadFromCacheOrDb(String recordKey){
        String cachedPayload = redisTemplate.opsForValue()
                .get(REDIS_ACTIVE_PREFIX + recordKey);
        if(cachedPayload != null){
            return cachedPayload;
        }

        Optional<HistoricalRecord> activeRecord = repository.findActiveRecordByKey(recordKey);
        if(activeRecord.isPresent()){
            String payload = activeRecord.get().getPayload();

            redisTemplate.opsForValue().set(REDIS_ACTIVE_PREFIX + recordKey, payload, Duration.ofHours(1));

            return payload;
        }

        return null;
    }
}