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

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductService productService;

    // ========== UPLOAD PRODUCTS ========== //
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadProducts(
            @RequestPart("data") String productDataJson,   // <-- JSON String হিসেবে নাও
            @RequestPart("images") List<MultipartFile> images
    ) throws Exception {

        // JSON String কে List<ProductRequest> তে convert করো
        ObjectMapper mapper = new ObjectMapper();
        List<ProductRequest> productData = Arrays.asList(
                mapper.readValue(productDataJson, ProductRequest[].class)
        );

        // Validation
        if (productData == null || images == null) {
            return ResponseEntity.badRequest().body("❌ data বা images পাওয়া যায়নি!");
        }

        if (productData.size() != images.size()) {
            return ResponseEntity.badRequest()
                    .body("❌ data JSON এবং images সংখ্যায় সমান হতে হবে!");
        }

        productService.saveProducts(productData, images);

        return ResponseEntity.ok("✔ " + images.size() + " পণ্য সফলভাবে আপলোড হয়েছে!");
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
}
