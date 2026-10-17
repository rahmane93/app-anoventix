package com.app.AnnoncesAPI.payload.request;

import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MediaRequest {
   
   @NotEmpty(message = "Aucun fichier n'a été sélectionné")
   private List<MultipartFile> medias;
}
