# Sync JSON keys

Utility for syncronising json flat json files, such as translation files.

The script will recursively compare all json files in the source directory with the destination directory. If any changes are found in the source directory they will be added to the files in the destination directory, overwriting the original values. If new keys have been added they will be added as-is to the destination. Keys will never be deleted from the destination directory.

## Usage

```
npm start [source directory] [destination directory]
```