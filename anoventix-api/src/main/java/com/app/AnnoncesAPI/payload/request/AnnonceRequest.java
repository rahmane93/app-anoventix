package com.app.AnnoncesAPI.payload.request;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import com.app.AnnoncesAPI.enums.TypeAnnonce;
import com.app.AnnoncesAPI.enums.TypeBien;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AnnonceRequest {
    
    @NotBlank(message = "Le titre est obligatoire")
    @Size(min = 5, max = 100, message = "Le titre doit contenir entre 5 et 100 caractères")
    private String titre;

    @NotBlank(message = "La description est obligatoire")
    @Size(min = 20, max = 2000, message = "La description doit contenir entre 20 et 2000 caractères")
    private String description;

    @NotNull(message = "Le prix est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false, message = "Le prix doit être supérieur à 0")
    private BigDecimal prix;

    @DecimalMin(value = "0.0", inclusive = false, message = "Le prix revisé doit être supérieur à 0")
    private BigDecimal prixRevise;

    @NotNull(message = "Le quartier est obligatoire")
    private String localisationId;

    private String complementAdresse;

    private BigDecimal longitude;
    private BigDecimal latitude;

    @NotNull(message = "Le type d'annonce est obligatoire")
    private TypeAnnonce typeAnnonce;

    @DecimalMin(value = "0.0", inclusive = true, message = "Les frais honoraire doit être supérieur ou egal à 0")
    private BigDecimal fraisHonoraire;

    @NotNull(message = "Le type de bien est obligatoire")
    private TypeBien typeBien;

    @NotBlank(message = "Vous devez mentionner au moins un document")
    private String documentsDisponibles;
    
    private List<MultipartFile> medias;
}

