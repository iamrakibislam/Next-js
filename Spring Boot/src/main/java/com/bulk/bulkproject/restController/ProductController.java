package com.bulk.bulkproject.restController;

import com.bulk.bulkproject.entity.ProductRequest;
import com.bulk.bulkproject.service.ProductService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    // ========== UPLOAD PRODUCTS ========== //
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadProducts(
            @RequestPart("data") String productDataJson,
            @RequestPart("images") List<MultipartFile> images) {

        try {
            ObjectMapper mapper = new ObjectMapper();
            List<ProductRequest> productData = Arrays.asList(
                    mapper.readValue(productDataJson, ProductRequest[].class)
            );

            productService.saveProducts(productData, images);

            return ResponseEntity.ok("✔ Products uploaded successfully!");

        } catch (RuntimeException dupEx) {
            return ResponseEntity.badRequest().body(dupEx.getMessage());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error: " + e.getMessage());
        }
    }


    // ========== GET ALL PRODUCTS ========== //
    @GetMapping("/list")
    public ResponseEntity<?> listProducts() throws Exception {
        return ResponseEntity.ok(productService.getAllProducts());
    }


    @DeleteMapping("/delete/{folder}")
    public ResponseEntity<?> deleteProduct(@PathVariable("folder") String folderName) {
        try {
            boolean deleted = productService.deleteProduct(folderName);

            if (!deleted) {
                return ResponseEntity.badRequest().body("❌ Product folder not found: " + folderName);
            }

            return ResponseEntity.ok("✔ Product deleted successfully: " + folderName);

        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error deleting product: " + e.getMessage());
        }
    }

    // ========== EDIT/UPDATE PRODUCT ========== //
    @PostMapping(value = "/edit/{folder}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> editProduct(
            @PathVariable("folder") String folderName,
            @RequestPart("data") String productDataJson,
            @RequestPart(value = "image", required = false) MultipartFile image
    ) {
        try {
            // Convert JSON to ProductRequest
            ObjectMapper mapper = new ObjectMapper();
            ProductRequest updatedData = mapper.readValue(productDataJson, ProductRequest.class);

            // Call service to update
            boolean success = productService.editProduct(folderName, updatedData, image);

            if (!success) {
                return ResponseEntity.badRequest().body("❌ Product folder not found: " + folderName);
            }

            return ResponseEntity.ok("✔ Product updated successfully: " + folderName);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body("❌ Error updating product: " + e.getMessage());
        }
    }
    @GetMapping("/search")
    public ResponseEntity<?> searchProducts(@RequestParam("name") String name) {
        try {
            List<Map<String, Object>> result = productService.searchProducts(name);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("❌ Error searching: " + e.getMessage());
        }
    }


}
