package com.example.ChronosQuery.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "historical_records")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HistoricalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Logical identifier (e.g., 'user_123') that remains constant
    @Column(nullable = false)
    private String recordKey;

    // The actual data content
    @Column(nullable = false, columnDefinition = "TEXT")
    private String payload;

    // Transaction Time: When this specific version was written to the DB
    @Column(nullable = false)
    private LocalDateTime systemStartTime;

    // Null means this is the currently "active" version
    @Column
    private LocalDateTime systemEndTime;
}
