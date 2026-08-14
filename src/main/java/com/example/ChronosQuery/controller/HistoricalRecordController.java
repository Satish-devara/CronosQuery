package com.example.ChronosQuery.controller;

import com.example.ChronosQuery.model.HistoricalRecord;
import com.example.ChronosQuery.service.HistoricalRecordService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.ChronosQuery.service.SseService;
import org.springframework.http.MediaType;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/records")
public class HistoricalRecordController {

    @Autowired
    private HistoricalRecordService service;

    @Autowired
    private SseService sseService;

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents() {
        return sseService.register();
    }

    @PostMapping
    public ResponseEntity<HistoricalRecord> upsertRecord(
            @RequestParam String key,
            @RequestBody String payload
    ){
        if (payload == null) {
            payload = "";
        }
        HistoricalRecord saveRecord = service.saveOrUpdateRecord(key, payload);
        return ResponseEntity.ok(saveRecord);
    }

    @GetMapping("/timerange")
    public ResponseEntity<List<HistoricalRecord>> getRecordsInTimeRange(
            @RequestParam String key,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime) {

        List<HistoricalRecord> records = service.getRecordsInTimeRange(key, startTime, endTime);
        return ResponseEntity.ok(records);
    }

    @GetMapping("/active")
    public ResponseEntity<String> getActiveRecord(@RequestParam String key){
        String payload = service.getActivePayloadFromCacheOrDb(key);
        if(payload != null){
            return ResponseEntity.ok(payload);
        }

        return ResponseEntity.notFound().build();
    }
}