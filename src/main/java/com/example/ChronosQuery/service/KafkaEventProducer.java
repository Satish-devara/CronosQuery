package com.example.ChronosQuery.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaEventProducer {

    private static final String TOPIC = "record-updates";

    @Autowired
    private KafkaTemplate<String, String>kafkaTemplate;

    public void sendUpdateEvent(String recordKey, String payload){
        String message = "Record updated: "+ recordKey + " | Data: "+payload;
        kafkaTemplate.send(TOPIC, recordKey, message);
    }
}
