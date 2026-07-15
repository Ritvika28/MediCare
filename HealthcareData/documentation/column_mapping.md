# Column Mapping Dictionary

This document details the column renaming, transformations, and aliases applied during the cleaning phase to standardize raw datasets into production schemas.

## Renaming Directory Indexes

### Hospitals Dataset (`hospital_directory.csv` -> `hospitals.csv`)
| Raw Column | Standardized Output Column | Action / Transformation |
| :--- | :--- | :--- |
| `Hospital_Name` | `Hospital_Name` | Kept as is, filled nulls |
| `Address_Original_First_Line` | `Address` | Mapped to Address |
| `Mobile_Number` | `MobileNumber` | Mapped to MobileNumber |
| `Emergency_Services` | `EmergencyServices` | Renamed to fit JS/MongoDB model |
| `Location_Coordinates` | `Latitude`, `Longitude` | Split coordinates string by comma and cast to float |

### Blood Banks Dataset (`blood_centre.csv` -> `bloodbanks.csv`)
| Raw Column | Standardized Output Column | Action / Transformation |
| :--- | :--- | :--- |
| `Blood Center` | `Blood Centre Name` | Standardized column name |
| `Phone` | `Contact No` | Mapped and cleaned digits |
| `Phone` | `Mobile` | Standardized column copy |
| `Address` | `Pincode` | Extracted 6-digit regex pincodes |

### Laboratories Dataset (`NABL_Laboratories.csv` -> `labs.csv`)
| Raw Column | Standardized Output Column | Action / Transformation |
| :--- | :--- | :--- |
| `City` | `District` | Standardized to District |
| `Address` | `Pincode` | Extracted 6-digit regex pincodes |

### PCOS Dataset (`PCOS_extended_dataset.csv` -> `pcos.csv`)
| Raw Column | Standardized Output Column | Action / Transformation |
| :--- | :--- | :--- |
| `Age (yrs)` | `Age (in years)` | Renamed to match config required keys |
| `Marraige Status (Yrs)` | `Marital Status (Yrs)`| Fixed raw typo in column name |
| `No. of abortions` | `No. of aborations` | Renamed to align with schema assertions |

### Heart Dataset (`heart_cleveland_upload.csv` -> `heart.csv`)
| Raw Column | Standardized Output Column | Action / Transformation |
| :--- | :--- | :--- |
| `condition` | `num` | Renamed target classifier label to match configuration rules |
