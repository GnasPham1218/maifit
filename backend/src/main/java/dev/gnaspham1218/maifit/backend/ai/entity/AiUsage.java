package dev.gnaspham1218.maifit.backend.ai.entity;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "ai_usage")
@IdClass(AiUsageId.class)
public class AiUsage {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Id
    @Column(name = "usage_date")
    private LocalDate usageDate;

    @Id
    @Enumerated(EnumType.STRING)
    @Column(name = "feature", length = 32)
    private AiFeature feature;

    @Column(nullable = false)
    private int count;

    @Column(name = "input_tokens", nullable = false)
    private long inputTokens;

    @Column(name = "output_tokens", nullable = false)
    private long outputTokens;

    protected AiUsage() {}

    public Long getUserId()         { return userId; }
    public LocalDate getUsageDate() { return usageDate; }
    public AiFeature getFeature()   { return feature; }
    public int getCount()           { return count; }
    public long getInputTokens()    { return inputTokens; }
    public long getOutputTokens()   { return outputTokens; }
}
