package com.app.AnnoncesAPI.payload.request;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

/** Nouvel ordre des photos d'une annonce : tous ses identifiants, la photo principale en premier. */
@Data
public class OrdreMediasRequest {

    @NotEmpty(message = "La liste des photos est obligatoire")
    private List<Long> mediaIds;
}
