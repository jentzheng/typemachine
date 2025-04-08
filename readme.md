# Typemachine-v8

**Typemachine-v8** is a Max MSP patch designed for dynamic text visualization and playback. It processes text files and outputs them character by character or line by line, with options for looping and customization of display dimensions.

## Features

- **Dynamic Text Playback**: Supports playback of text files either by line or by character.
- **Customizable Display**: Adjustable dimensions for the display matrix.
- **Looping**: Option to loop the playback of text files.
- **Interactive Console**: Allows real-time text input and visualization.
- **File Selection**: Load and process `.txt` files dynamically.

## JavaScript Integration

The core functionality is implemented in the JavaScript file [`typemachine-v8.js`](code/typemachine-v8.js). Key components include:

- **Matrix Operations**: Uses `JitterMatrix` for text visualization.
- **Playback Logic**: Handles looping, playback modes, and real-time updates.
- **Console Input**: Processes user input dynamically.

## Sample Text Files

- **`poetry.txt`**: Contains multilingual poetry for testing.
- **`test.txt`**: A simple visual pattern for debugging.

## Help Patch

For a guided walkthrough of the patch, open `typemachine-v8.maxhelp` in Max MSP.

## Requirements

- Max MSP 9.0 or later.
- Compatible with macOS and Windows.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.

## Acknowledgments

Special thanks to the Max MSP community for their support and resources.

---

Enjoy creating with **Typemachine-v8**!
