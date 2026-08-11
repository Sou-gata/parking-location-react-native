import { cssInterop } from "nativewind";
import {
    Surface,
    IconButton,
    Avatar,
    Button,
    TextInput,
    Card,
    Divider,
    Text,
    Checkbox,
    RadioButton,
    ProgressBar,
    Badge,
    List,
    Drawer,
    Searchbar,
    // Chip,
    Modal,
} from "react-native-paper";

// cssInterop(Chip, { className: "style" });
cssInterop(Modal, { className: "contentContainerStyle" });
cssInterop(Searchbar, { className: "style" });
cssInterop(Surface, { className: "style" });
cssInterop(IconButton, { className: "style" });
cssInterop(Button, { className: "style" });
cssInterop(TextInput, { className: "style" });
cssInterop(Divider, { className: "style" });
cssInterop(Text, { className: "style" });
cssInterop(Checkbox, { className: "style" });
cssInterop(ProgressBar, { className: "style" });
cssInterop(Badge, { className: "style" });

// Avatars
cssInterop(Avatar.Icon, { className: "style" });
cssInterop(Avatar.Image, { className: "style" });
cssInterop(Avatar.Text, { className: "style" });

// Cards
cssInterop(Card, { className: "style" });
cssInterop(Card.Content, { className: "style" });
cssInterop(Card.Actions, { className: "style" });
cssInterop(Card.Cover, { className: "style" });

// Lists
cssInterop(List.Section, { className: "style" });
cssInterop(List.Item, { className: "style" });
cssInterop(List.Accordion, { className: "style" });

// RadioButtons
cssInterop(RadioButton, { className: "style" });
cssInterop(RadioButton.Item, { className: "style" });
cssInterop(RadioButton.Group, { className: "style" });

// Drawer
cssInterop(Drawer.Section, { className: "style" });
cssInterop(Drawer.Item, { className: "style" });
cssInterop(Drawer.CollapsedItem, { className: "style" });
