package com.app.AnnoncesAPI.entities;

import java.util.UUID;

import org.hibernate.annotations.UuidGenerator;

import com.app.AnnoncesAPI.enums.TypeRole;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Role {
    @Id
    @GeneratedValue(generator = "UUID")
    @UuidGenerator
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TypeRole name;
}
