package com.example.ChronosQuery.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class AIService {

    @Autowired
    private SseService sseService;

    @KafkaListener(topics = "record-updates", groupId = "ai-analyzer-group")
    public void analyzePayloadForAnomalies(String message){
        if(message.contains("DELETE") || message.contains("TRUNCATE")){
            String threatMsg = "🚨 AI DETECTED POTENTIAL THREAT: " + message;
            System.err.println(threatMsg);
            sseService.broadcast("ai-security-log", threatMsg);
        }else{
            String normalMsg = "✅ AI Check: Transaction appears normal. (" + message.split(" \\| ")[0] + ")";
            System.out.println(normalMsg);
            sseService.broadcast("ai-security-log", normalMsg);
        }
    }
}
