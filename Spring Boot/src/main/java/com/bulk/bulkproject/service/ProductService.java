package com.bulk.bulkproject.service;

import com.bulk.bulkproject.entity.ProductRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.util.*;

@Service
public class ProductService {

    @Value("${product.storage.path}")  // e.g., D:/bulkproject-storage
    private String storagePath;

    private final ObjectMapper mapper = new ObjectMapper();

    public void saveProducts(List<ProductRequest> productData, List<MultipartFile> images) throws Exception {

        // Ensure root storage directory exists
        File rootDir = new File(storagePath);
        if (!rootDir.exists()) {
            boolean created = rootDir.mkdirs();
            if (!created) throw new RuntimeException("Failed to create root storage folder: " + rootDir.getAbsolutePath());
        }

        for (int i = 0; i < images.size(); i++) {
            ProductRequest data = productData.get(i);
            MultipartFile image = images.get(i);

            if (image.isEmpty()) {
                throw new RuntimeException("Image file is empty for product: " + data.getName());
            }

            // Create unique product folder
            String folderName = "product_" + UUID.randomUUID();
            File productDir = new File(rootDir, folderName);

            if (!productDir.exists()) {
                boolean created = productDir.mkdirs();
                if (!created) throw new RuntimeException("Failed to create product folder: " + productDir.getAbsolutePath());
            }

            // Save image file
            String imageName = image.getOriginalFilename();
            File imageFile = new File(productDir, imageName);
            image.transferTo(imageFile);

            // Generate image URL for frontend
            String imageUrl =  folderName + "/" + imageName;

            // Save product JSON
            Map<String, Object> json = new HashMap<>();
            json.put("name", data.getName());
            json.put("description", data.getDescription());
            json.put("price", data.getPrice());
            json.put("imageUrl", imageUrl);

            File jsonFile = new File(productDir, "product.json");
            mapper.writeValue(jsonFile, json);

            // Debug logs
            System.out.println("Saved product folder: " + productDir.getAbsolutePath());
            System.out.println("Saved image: " + imageFile.getAbsolutePath());
            System.out.println("Saved JSON: " + jsonFile.getAbsolutePath());
        }
    }

    public List<Map<String, Object>> getAllProducts() throws Exception {
        List<Map<String, Object>> products = new ArrayList<>();
        File root = new File(storagePath);

        if (!root.exists()) return products;

        for (File folder : root.listFiles()) {
            if (folder.isDirectory()) {
                File jsonFile = new File(folder, "product.json");
                if (jsonFile.exists()) {
                    Map<String, Object> product = mapper.readValue(jsonFile, Map.class);
                    products.add(product);
                }
            }
        }

        return products;
    }


    public boolean deleteProduct(String folderName) throws Exception {
        File root = new File(storagePath);
        File productDir = new File(root, folderName);

        if (!productDir.exists()) {
            return false;  // folder not found
        }

        // Delete folder with all files inside
        deleteDirectory(productDir);

        System.out.println("Deleted product folder: " + productDir.getAbsolutePath());
        return true;
    }

    // Recursive delete directory
    private void deleteDirectory(File directory) {
        File[] allContents = directory.listFiles();
        if (allContents != null) {
            for (File file : allContents) {
                deleteDirectory(file);
            }
        }
        directory.delete();
    }

    public boolean editProduct(String folderName, ProductRequest updatedData, MultipartFile newImage) throws Exception {
        File root = new File(storagePath);
        File productDir = new File(root, folderName);

        if (!productDir.exists()) return false;

        // Load existing product.json
        File jsonFile = new File(productDir, "product.json");
        Map<String, Object> productMap = jsonFile.exists()
                ? mapper.readValue(jsonFile, Map.class)
                : new HashMap<>();

        // Update fields
        productMap.put("name", updatedData.getName());
        productMap.put("description", updatedData.getDescription());
        productMap.put("price", updatedData.getPrice());

        // Replace image if new one provided
        if (newImage != null && !newImage.isEmpty()) {
            // Delete old image
            String oldImageName = (String) productMap.get("imageUrl");
            if (oldImageName != null) {
                File oldImageFile = new File(root, oldImageName);
                if (oldImageFile.exists()) oldImageFile.delete();
            }

            // Save new image
            String newImageName = newImage.getOriginalFilename();
            File imageFile = new File(productDir, newImageName);
            newImage.transferTo(imageFile);

            productMap.put("imageUrl", folderName + "/" + newImageName);
        }

        // Write updated JSON
        mapper.writeValue(jsonFile, productMap);

        System.out.println("Updated product folder: " + productDir.getAbsolutePath());
        return true;
    }

}
