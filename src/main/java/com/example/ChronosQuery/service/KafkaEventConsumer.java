package com.example.ChronosQuery.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class KafkaEventConsumer {

    @Autowired
    private SseService sseService;

    @KafkaListener(topics = "record-updates", groupId = "chronos-group")
    public void consume(String message){
        System.out.println("--- KAFKA EVENT RECEIVED ---");
        System.out.println("Processing async task for: " + message);
        sseService.broadcast("kafka-event", message);
    }
}
