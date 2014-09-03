function submitForm(pluginName, method) {
    var url = $("#url" + pluginName).val();
    var button = $("#button" + pluginName);
    var form = $("#form" + pluginName);

    button.button("loading");
    var request = $.ajax({
        timeout: 900000,
        type: method,
        url: url,
        data: form.serialize()
    });

    request.done(function (data) {
        $("#output" + pluginName).html(JSON.stringify(data, null, 4));
        button.button("reset");
    });
    request.fail(function (jqXHR, textStatus) {
        $("#output" + pluginName).html(JSON.stringify(jqXHR, null, 4));
        button.button("reset");
    });
};