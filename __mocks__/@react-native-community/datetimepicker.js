// Mock manual para tests: el componente real es nativo y no se puede montar
// bajo Jest. Los tests de los wrappers (ScheduleDateTimePickerField, etc.)
// verifican el estado que controla cuándo se monta este componente, no su
// UI interna nativa.
function DateTimePicker() {
  return null;
}

module.exports = DateTimePicker;
module.exports.default = DateTimePicker;
